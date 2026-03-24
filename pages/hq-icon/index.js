import {getTopApps, searchApp} from '../../utils/itunes';
import {ActionSheet, Toast} from 'tdesign-miniprogram';
import {ActionSheetTheme} from 'tdesign-miniprogram/action-sheet/index';
import {
    actionSheetItems,
    COUNTRY_MAPS,
    CUT_MAPS,
    ENTITY_MAPS,
    FORMAT_MAPS,
    LIMIT_MAPS,
    RESOLUTION_MAPS
} from "../../data/hq-icon-config";

Page({
    data: {
        term: '',
        searchPlaceholder: '搜索应用...',
        results: [],
        loading: false,
        loadingText: '搜索中...',
        hasSearched: false,
        filterVisible: false,

        // Settings
        entity: 'software',
        country: 'cn',
        limit: '18',
        resolution: '512',
        cut: '1',
        format: 'png',

        isCountryExpanded: false,

        // Maps
        ENTITY_MAPS,
        COUNTRY_MAPS,
        FORMAT_MAPS,
        RESOLUTION_MAPS,
        LIMIT_MAPS,
        CUT_MAPS,

        // Icons
        iconSize: 320,
        iconRadius: 72,

        // Preview
        previewVisible: false,
        previewImageUrl: '',
        isMobile: false,

        currentItem: null,
    },

    onLoad() {
        const settings = ['entity', 'country', 'limit', 'resolution', 'cut', 'format'];
        const savedSettings = {};
        settings.forEach(key => {
            const value = wx.getStorageSync(key);
            if (value) {
                savedSettings[key] = value;
            }
        });

        const platform = wx.getDeviceInfo().platform;
        const isMobile = platform === 'ios' || platform === 'android' || platform === 'ohos';
        this.setData({isMobile});

        if (Object.keys(savedSettings).length > 0) {
            this.setData(savedSettings, () => {
                const ent = this.data.entity;
                let cut = '1';
                if (ent === 'desktopSoftware') {
                    cut = '0';
                } else {
                    const k = `cut_${ent}`;
                    const s = wx.getStorageSync(k);
                    cut = s || this.data.cut || '1';
                }
                wx.setStorageSync('cut', cut);
                this.setData({ cut }, () => {
                    this.loadTopApps();
                });
            });
        } else {
            this.loadTopApps();
        }
    },

    showFilter() {
        this.setData({
            filterVisible: true
        }, () => {
            setTimeout(() => {
                this.measureCountryHeights();
            }, 100);
        });
    },

    measureCountryHeights() {
        if (this.data.collapsedHeight && this.data.expandedHeight) return;

        const query = this.createSelectorQuery();
        query.select('#country-grid').boundingClientRect();
        query.selectAll('#country-grid .filter-option').boundingClientRect();
        query.exec((res) => {
            if (!res[0] || !res[1] || res[1].length < 9) return;

            const gridRect = res[0];
            const itemRects = res[1];
            const lastItem = itemRects[itemRects.length - 1];
            const eighthItem = itemRects[7];

            const paddingBottom = gridRect.bottom - lastItem.bottom;

            const collapsedHeight = (eighthItem.bottom - gridRect.top) + paddingBottom;
            const expandedHeight = gridRect.height;

            this.setData({
                collapsedHeight,
                expandedHeight,
                countryHeight: this.data.isCountryExpanded ? expandedHeight : collapsedHeight
            });
        });
    },

    closeFilter() {
        this.setData({
            filterVisible: false
        });
    },

    onFilterVisibleChange(e) {
        this.setData({
            filterVisible: e.detail.visible
        });
    },

    toggleCountryExpand() {
        const isExpanded = !this.data.isCountryExpanded;
        const {collapsedHeight, expandedHeight} = this.data;

        this.setData({
            isCountryExpanded: isExpanded, countryHeight: isExpanded ? expandedHeight : collapsedHeight
        });
    },

    // Setting Changes
    onOptionChange(e) {
        const {
            key,
            value,
            disabled
        } = e.currentTarget.dataset;

        if (this.data[key] === value) return;

        if (key === 'cut' && (disabled || (this.data.entity === 'desktopSoftware' && value !== '0'))) {
            Toast({
                context: this,
                selector: '#t-toast',
                message: 'macOS 仅支持原始图像',
                theme: 'warning'
            });
            return;
        }

        const updates = { [key]: value };
        if (key === 'entity') {
            if (value === 'desktopSoftware') {
                updates.cut = '0';
                wx.setStorageSync('cut_desktopSoftware', '0');
            } else {
                const cutKey = `cut_${value}`;
                const saved = wx.getStorageSync(cutKey);
                updates.cut = saved || '1';
            }
            wx.setStorageSync('cut', updates.cut);
        } else if (key === 'cut') {
            const ent = this.data.entity;
            const cutKey = `cut_${ent}`;
            wx.setStorageSync(cutKey, value);
            wx.setStorageSync('cut', value);
        }

        Object.keys(updates).forEach(k => wx.setStorageSync(k, updates[k]));

        this.setData(updates, () => {
            if (this.data.hasSearched) {
                const searchKeys = ['country', 'entity', 'limit'];
                const processKeys = ['resolution', 'format', 'cut'];

                if (searchKeys.includes(key) && this.data.term) {
                    this.onSearch();
                } else if (processKeys.includes(key) && this.data.rawResults) {
                    this.processResults(this.data.rawResults);
                }
            } else {
                if ((key === 'country' || key === 'entity') && !this.data.term) {
                    this.loadTopApps();
                } else if (['resolution', 'format', 'cut'].includes(key) && this.data.rawResults) {
                    this.processResults(this.data.rawResults);
                }
            }
        });
    },

    async loadTopApps() {
        const {
            country, limit, entity
        } = this.data;

        if (entity !== 'software') {
            this.setData({
                results: []
            });
            this.data.rawResults = [];
            return;
        }

        this.setData({
            loading: true, loadingText: '载入热门应用中...'
        });

        try {
            const data = await getTopApps(country, limit);
            if (data && data.results) {
                this.data.rawResults = data.results;
                this.processResults(data.results);
            }
        } catch (err) {
            console.error(err);
            Toast({
                context: this, selector: '#t-toast', message: '加载失败', theme: 'error'
            });
        } finally {
            this.setData({
                loading: false
            });
        }
    },

    async onSearch() {
        const {
            term, country, entity, limit
        } = this.data;
        if (!term.trim()) return;

        this.data.rawResults = null;

        this.setData({
            loading: true, loadingText: '搜索应用中...', hasSearched: true, results: []
        });

        try {
            const data = await searchApp(term, country, entity, limit);
            this.data.rawResults = data.results;
            this.processResults(data.results);
        } catch (err) {
            console.error(err);
            Toast({
                context: this, selector: '#t-toast', message: '搜索失败，请重试', theme: 'error'
            });
        } finally {
            this.setData({
                loading: false
            });
        }
    },

    onClear() {
        this.data.rawResults = null;
        this.setData({
            term: '', results: [], hasSearched: false
        }, () => {
            this.loadTopApps();
        });
    },

    processResults(results) {
        if (!results) return;
        const {
            resolution, format, cut
        } = this.data;

        const processed = results.map(item => {
            const artworkUrl512 = item.artworkUrl512;
            const iOSDefaultUrl = '/512x512bb.jpg';
            const macDefaultUrl = '/512x512bb.png';

            let ext = format;
            if (format === 'jpeg') ext = 'jpg';

            const mark = cut === '1' ? 'ia-100' : 'bb-100';
            const newUrlSuffix = `/${resolution}x${resolution}${mark}.${ext}`;
            let displayImage = artworkUrl512.replace(iOSDefaultUrl, newUrlSuffix).replace(macDefaultUrl, newUrlSuffix);

            if (displayImage === artworkUrl512) {
                const parts = artworkUrl512.split('/');
                parts.pop();
                parts.push(`${resolution}x${resolution}${mark}.${ext}`);
                displayImage = parts.join('/');
            }

            return {
                ...item, displayImage, platform: item.kind.startsWith('mac') ? 'macOS' : 'iOS'
            };
        });

        this.setData({
            results: processed
        });
    },

    onItemClick(e) {
        const {item} = e.currentTarget.dataset;
        this.setData({
            currentItem: item
        });
        ActionSheet.show({
            theme: ActionSheetTheme.Grid,
            selector: '#t-action-sheet',
            context: this,
            items: actionSheetItems,
            description: item.trackName,
        });
    },

    onActionSheetClose() {
        this.setData({
            currentItem: null
        });
    },

    onActionSheetSelect(e) {
        const {index} = e.detail;
        const {currentItem} = this.data;

        if (!currentItem) return;

        this.onActionSheetClose();

        switch (index) {
            case 0: // 保存到相册
                this.downloadImage(currentItem);
                break;
            case 1: // 分享到聊天
                this.shareImageAsFile(currentItem);
                break;
            case 2: // 添加到收藏
                this.addImageToFavorites(currentItem);
                break;
            case 3: // 查看原图
                if (!this.data.isMobile) wx.previewImage({
                    current: currentItem.displayImage, urls: [currentItem.displayImage]
                }); else this.setData({
                    previewVisible: true, previewImageUrl: currentItem.displayImage
                });
                break;
        }
    },

    closePreview() {
        this.setData({
            previewVisible: false, previewImageUrl: ''
        });
    },

    async downloadImage(item) {
        wx.showLoading({
            title: '处理中...', mask: true
        });

        try {
            const {filePath} = await this.prepareImageFile(item);
            await this.saveToAlbum(filePath);
            wx.hideLoading();
            Toast({
                context: this, selector: '#t-toast', message: '保存成功', theme: 'success'
            });
        } catch (err) {
            console.error(err);
            wx.hideLoading();
            Toast({
                context: this, selector: '#t-toast', message: '保存失败: ' + (err.errMsg || '未知错误'), theme: 'error'
            });
        }
    },

    async shareImageAsFile(item) {
        const canShare = wx.canIUse && wx.canIUse('shareFileMessage');
        if (!canShare || typeof wx.shareFileMessage !== 'function') {
            Toast({
                context: this, selector: '#t-toast', message: '当前版本不支持文件分享', theme: 'error'
            });
            return;
        }
        wx.showLoading({
            title: '处理中...', mask: true
        });
        try {
            const {filePath, fileName} = await this.prepareImageFile(item);
            await new Promise((resolve, reject) => {
                wx.shareFileMessage({
                    filePath, fileName, success: resolve, fail: reject
                });
            });
            wx.hideLoading();
            Toast({
                context: this, selector: '#t-toast', message: '已分享到聊天', theme: 'success'
            });
        } catch (err) {
            console.error(err);
            wx.hideLoading();
            Toast({
                context: this, selector: '#t-toast', message: '分享失败: ' + (err.errMsg || '未知错误'), theme: 'error'
            });
        }
    },

    async addImageToFavorites(item) {
        const canFav = wx.canIUse && wx.canIUse('addFileToFavorites');
        if (!canFav || typeof wx.addFileToFavorites !== 'function') {
            Toast({
                context: this, selector: '#t-toast', message: '当前版本不支持添加到收藏', theme: 'error'
            });
            return;
        }
        wx.showLoading({
            title: '处理中...', mask: true
        });
        try {
            const {filePath, fileName} = await this.prepareImageFile(item);
            await new Promise((resolve, reject) => {
                wx.addFileToFavorites({
                    filePath, fileName, success: resolve, fail: reject
                });
            });
            wx.hideLoading();
            Toast({
                context: this, selector: '#t-toast', message: '已添加到收藏', theme: 'success'
            });
        } catch (err) {
            console.error(err);
            wx.hideLoading();
            Toast({
                context: this, selector: '#t-toast', message: '添加失败: ' + (err.errMsg || '未知错误'), theme: 'error'
            });
        }
    },

    buildSaveFileName(item) {
        const name = this.sanitizeFileName(item.trackName || 'app');
        const r = this.data.resolution;
        const resStr = `${r}x${r}`;
        const mark = this.data.cut === '1' ? 'ia' : 'bb';
        let ext = this.data.format;
        if (ext === 'jpeg') ext = 'jpg';
        return `${name}-${resStr}-${mark}.${ext}`;
    },

    sanitizeFileName(str) {
        const s = String(str).trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-');
        return s.slice(0, 120) || 'app';
    },

    prepareImageFile(item) {
        const name = this.buildSaveFileName(item);
        const destPath = `${wx.env.USER_DATA_PATH}/${name}`;
        return this.downloadFile(item.displayImage, destPath).then((filePath) => ({
            filePath, fileName: name
        }));
    },

    downloadFile(url, targetPath) {
        return new Promise((resolve, reject) => {
            wx.downloadFile({
                url: url.replace('http:', 'https:'), filePath: targetPath, success: (res) => {
                    if (res.statusCode === 200) resolve(res.filePath || res.tempFilePath); else reject(new Error('Download failed: ' + res.statusCode));
                }, fail: (err) => {
                    console.error('Download failed', err);
                    reject(err);
                }
            });
        });
    },

    saveToAlbum(filePath) {
        return new Promise((resolve, reject) => {
            wx.saveImageToPhotosAlbum({
                filePath, success: resolve, fail: (err) => {
                    reject(err);
                }
            });
        });
    },
});

// ==UserScript==
// @name         Acfun.AutoDel
// @namespace    https://github.com/
// @version      23.02.16
// @description  用于自动删除Acfun个人收藏夹已失效的收藏稿件记录/空收藏夹。
// @author       monSteRhhe
// @match        http*://www.acfun.cn/member*
// @icon         https://cdn.aixifan.com/ico/favicon.ico
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_addStyle
// @run-at       document-end
// @require      https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js
// ==/UserScript==
/* globals axios, waitForKeyElements */

(function() {
    'use strict';

    /* 收藏夹列表 */
    function get_folder_list() {
        axios({
            method: 'post',
            url: 'https://www.acfun.cn/rest/pc-direct/favorite/folder/list'
        })
        .then(function (response) {
            var folder_arr = response.data.dataList;
            folder_arr.forEach(function(data) {
                get_content_list(data.folderId, 1, data.name, 0);
            })

            // 是否删除收藏夹
            if(GM_getValue('status')) {
                get_new_folder_list();
            }
        });
    }

    /* 收藏夹记录列表 */
    function get_content_list(fid, page, name, del_count) {
        axios({
            method: 'post',
            url: 'https://www.acfun.cn/rest/pc-direct/favorite/resource/dougaList',
            params: {
                folderId: fid,
                page: page,
                perpage: 30
            }
        })
        .then(function (response) {
            var res_arr = response.data.favoriteList;
            res_arr.forEach(function(data) {
                // status为0正常，为1失效
                if(data.status == 1) {
                    del_res(fid, data.contentId);
                    del_count += 1;
                }
            })

            // 是否有下一页
            if(response.data.total / 30 > response.data.page) {
                page += 1;
                get_content_list(fid, page, name, del_count);
            } else {
                if(del_count > 0) {
                    GM_notification({
                        text: '「' + name + '」收藏夹内的失效内容已删除。',
                        title: 'AcDel',
                        image: 'https://cdn.aixifan.com/ico/favicon.ico',
                        timeout: 2000,
                    });
                } else {
                    GM_notification({
                        text: '没有失效内容需要删除~',
                        title: 'AcDel',
                        image: 'https://cdn.aixifan.com/ico/favicon.ico',
                        timeout: 2000,
                    });
                }
            }
        });
    }

    /* 删除失效内容 */
    function del_res(fid, cid) {
        axios({
            method: 'post',
            url: 'https://www.acfun.cn/rest/pc-direct/favorite/resource/remove',
            params: {
                resourceType: 9,
                resourceId: cid, // 对应contentId
                delFolderIds: fid // 对应folderId
            }
        })
    }

    /* 删除收藏夹 */
    function get_new_folder_list() {
        axios({
            method: 'post',
            url: 'https://www.acfun.cn/rest/pc-direct/favorite/folder/list'
        })
        .then(function (response) {
            var folder_arr = response.data.dataList;
            folder_arr.forEach(function(data) {
                // 删除空收藏夹，默认收藏夹type为1，非默认收藏夹为2
                if(data.resourceCount == 0 && data.type != 1) {
                    del_folder(data.folderId, data.name);
                }
            });
        })
    }

    function del_folder(fid, name) {
        axios({
            method: 'post',
            url: 'https://www.acfun.cn/rest/pc-direct/favorite/folder/delete',
            params: {
                folderId: fid
            }
        })
        .then(function (response) {
            if(response.data.result == 0) {
                GM_notification({
                    text: '「' + name + '」收藏夹已删除。',
                    title: 'AcDel',
                    image: 'https://cdn.aixifan.com/ico/favicon.ico',
                    timeout: 2000,
                });
            }
        })
    }

    /* 添加触发 */
    function create_trigger() {
        var node = document.createElement('span');
        node.innerHTML = '删除失效内容';
        node.className = 'acdel-btn';
        node.onclick = () => get_folder_list();

        let a = document.getElementsByClassName('ac-member-favourite-folder-header')[0];
        if(a != null) {
            a.appendChild(node);
        }
    }

    GM_addStyle('\
        span.acdel-btn {\
            margin-left: 1rem;\
        }\
        span.acdel-btn:hover {\
            cursor: pointer;\
            text-decoration: underline;\
        }\
    ')

    /* 监控页面改变，匹配收藏夹页面 */
    document.getElementsByClassName('ac-member-main')[0].addEventListener('DOMNodeInserted', function() {
        if(window.location.href.indexOf('www.acfun.cn/member/favourite') >= 0) {
            if(!document.getElementsByClassName('acdel-btn')[0]) {
                create_trigger();
            }
        }
    });

    /* 菜单删除收藏夹开关 */
    let status = true; // 默认删除空收藏夹
    if(typeof(GM_getValue('status')) != 'undefined') {
        status = GM_getValue('status');
    } else {
        GM_setValue('status', status);
    }

    let name = String(status ? '[✔]' : '[✖]') + ' 删除空收藏夹';
    let menu = GM_registerMenuCommand(name, () => {
        menu_toggle(status, menu);
    });

    function menu_toggle(status, menu) {
        status = !status;
        GM_setValue('status', status);

        GM_unregisterMenuCommand(menu);

        let name = String(status ? '[✔]' : '[✖]') + ' 删除空收藏夹';
        menu = GM_registerMenuCommand(name, () => {
            menu_toggle(status, menu);
        });
    }
})();
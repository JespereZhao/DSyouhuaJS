/***********************************************

> 应用名称：度网去广告脚本
> 优化重点：代码可读性｜维护性｜拦截效率
> 更新日期：2025-02-16

[rewrite_local]

# 通用广告拦截
^https?:\/\/(pan|afd)\.baidu\.com\/(api\/getsyscfg|afd\/entry|rest\/.*\/(membership\/proxy\/guide|pcs\/ad)|act\/(v\d\/(bchannel|welfare)\/list|api\/activityentry)|feed\/hotlist|coins\/center\/notice|queryintent\/queryhint|feed\/cardinfos) url script-response-body https://raw.githubusercontent.com/moyu-mod/scripts/main/baiduCloud.js
^https?:\/\/.*(zhangyuyidong\.cn\/api\/zysdk|baidu\.com\/rest\/.*\/membership\/proxy\/guide) url reject-200

[mitm]
hostname = *.baidu.com, *.bdstatic.com, *.zhangyuyidong.cn

***********************************************/

const adConfig = {
    blockKeys: ['ad', 'splash', 'advert', 'promotion', 'banner'],
    blockDomains: ['adx.baidu.com', 'mobads.baidu.com', 'cbjs.baidu.com'],
    jsonKeys: ['ad_data', 'banner_data', 'splash_ads']
};

function modifyResponse(body) {
    try {
        let data = JSON.parse(body);
        
        // 通用广告字段清除
        adConfig.jsonKeys.forEach(key => {
            if (data[key]) {
                data[key] = Array.isArray(data[key]) ? [] : {};
            }
        });

        // 特定接口处理
        if ($request.url.includes('api/getsyscfg')) {
            ['splash_config', 'activity_entry'].forEach(k => delete data[k]);
            data.bottom_area?.cfg_list = filterAds(data.bottom_area?.cfg_list);
        }
        
        if ($request.url.includes('feed/cardinfos')) {
            data.data?.card_infos = data.data?.card_infos.filter(item => 
                !['hot_search', 'promotion_card'].includes(item.card_type)
            );
        }

        return JSON.stringify(data);
    } catch (e) {
        console.log(`广告拦截异常：${e}`);
        return body;
    }
}

function filterAds(list) {
    return list?.filter(item => 
        !adConfig.blockKeys.some(k => 
            JSON.stringify(item).toLowerCase().includes(k)
        )
    ) || [];
}

if (typeof $task != 'undefined') {
    $task.listen({
        type: 'http-response',
        filter: { protocols: ['http','https'] }
    }, res => {
        if (adConfig.blockDomains.some(d => res.request.url.includes(d))) {
            res.body = modifyResponse(res.body);
            $task.next({ body: res.body });
        } else {
            $task.next();
        }
    });
}

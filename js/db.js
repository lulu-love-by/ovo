// --- 数据库与全局状态 (js/db.js) ---

// 常量定义
const BLOCKED_API_DOMAINS = [
    'api522.pro',
    'api521.pro',
    'api520.pro'
];

const colorThemes = {
    'white_pink': {
        name: '白/粉',
        received: {bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D'},
        sent: {bg: 'rgba(255,204,204,0.9)', text: '#A56767'}
    },
    'white_blue': {
        name: '白/蓝',
        received: {bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D'},
        sent: {bg: 'rgba(173,216,230,0.9)', text: '#4A6F8A'}
    },
    'white_yellow': {
        name: '白/黄',
        received: {bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D'},
        sent: {bg: 'rgba(249,237,105,0.9)', text: '#8B7E4B'}
    },
    'white_green': {
        name: '白/绿',
        received: {bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D'},
        sent: {bg: 'rgba(188,238,188,0.9)', text: '#4F784F'}
    },
    'white_purple': {
        name: '白/紫',
        received: {bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D'},
        sent: {bg: 'rgba(185,190,240,0.9)', text: '#6C5B7B'}
    },
    'black_red': {
        name: '黑/红',
        received: {bg: 'rgba(30,30,30,0.85)', text: '#E0E0E0'},
        sent: {bg: 'rgb(226,62,87,0.9)', text: '#fff'}
    },
    'black_green': {
        name: '黑/绿',
        received: {bg: 'rgba(30,30,30,0.85)', text: '#E0E0E0'},
        sent: {bg: 'rgba(119,221,119,0.9)', text: '#2E5C2E'}
    },
    'black_white': {
        name: '黑/白',
        received: {bg: 'rgba(30,30,30,0.85)', text: '#E0E0E0'},
        sent: {bg: 'rgba(245,245,245,0.9)', text: '#333'}
    },
    'white_black': {
        name: '白/黑',
        received: {bg: 'rgba(255,255,255,0.9)', text: '#6D6D6D'},
        sent: {bg: 'rgba(50,50,50,0.85)', text: '#F5F5F5'}
    },
    'yellow_purple': {
        name: '黄/紫',
        received: {bg: 'rgba(255,250,205,0.9)', text: '#8B7E4B'},
        sent: {bg: 'rgba(185,190,240,0.9)', text: '#6C5B7B'}
    },
    'pink_blue': {
        name: '粉/蓝',
        received: {bg: 'rgba(255,231,240,0.9)', text: '#7C6770'},
        sent: {bg: 'rgba(173,216,230,0.9)', text: '#4A6F8A'}
    },
};

const defaultWidgetSettings = {
    centralCircleImage: 'https://i.postimg.cc/mD83gR29/avatar-1.jpg',
    topLeft: { emoji: '🎧', text: '𝑀𝑒𝑚𝑜𝑟𝑖𝑒𝑠✞' },
    topRight: { emoji: '🐈‍⬛', text: '𐙚 ♰.𝐾𝑖𝑡𝑡𝑒𝑛.♰' },
    bottomLeft: { emoji: '💿', text: '᪗₊𝔹𝕒𝕓𝕖𝕚𝕤₊' },
    bottomRight: { emoji: '🥛', text: '.☘︎ ˖+×+.' }
};

const defaultIcons = {
    'chat-list-screen': {name: '404', url: 'https://i.postimg.cc/VvQB8dQT/chan-143.png'},
    'api-settings-screen': {name: 'api', url: 'https://i.postimg.cc/50FqT8GL/chan-125.png'},
    'wallpaper-screen': {name: '壁纸', url: 'https://i.postimg.cc/3wqFttL3/chan-90.png'},
    'world-book-screen': {name: '世界书', url: 'https://i.postimg.cc/prCWkrKT/chan-74.png'},
    'customize-screen': {name: '自定义', url: 'https://i.postimg.cc/vZVdC7gt/chan-133.png'},
    'font-settings-screen': {name: '字体', url: 'https://i.postimg.cc/FzVtC0x4/chan-21.png'},
    'tutorial-screen': {name: '教程', url: 'https://i.postimg.cc/6QgNzCFf/chan-118.png'},
    'day-mode-btn': {name: '白昼模式', url: 'https://i.postimg.cc/Jz0tYqnT/chan-145.png'},
    'night-mode-btn': {name: '夜间模式', url: 'https://i.postimg.cc/htYvkdQK/chan-146.png'},
    'music-screen': {name: '音乐', url: 'https://i.postimg.cc/ydd65txK/1758451018266.png'},
    'console-screen': {name: '控制台', url: 'https://i.postimg.cc/sfMwnRvn/ji-lichan-(128).png'},
    'storage-analysis-screen': {name: '存储分析', url: 'https://i.postimg.cc/J0F3Lt0T/chan-107.png'},
    'widget-market-screen': {name: '小组件', url: 'https://i.postimg.cc/NG2k67zS/ji-lichan-(138).png'},
    'reader-bookshelf-screen': {name: '阅读器', url: 'https://i.postimg.cc/FHkvm6WG/ji-lichan-(41).png'},
    'placeholder-app': {name: '<3', url: 'https://i.postimg.cc/kGSN7qSq/ji-lichan-(136).png'}
};

const peekScreenApps = {
    'messages': { name: '消息', url: 'https://i.postimg.cc/Kvs4tDh5/export202509181826424260.png' },
    'memos': { name: '备忘录', url: 'https://i.postimg.cc/JzD0xH1C/export202509181829064550.png' },
    'cart': { name: '购物车', url: 'https://i.postimg.cc/pLwT6VTh/export202509181830143960.png' },
    'transfer': { name: '中转站', url: 'https://i.postimg.cc/63wQBHCB/export202509181831140230.png' },
    'browser': { name: '浏览器', url: 'https://i.postimg.cc/SKcsF02Z/export202509181830445980.png' },
    'drafts': { name: '草稿箱', url: 'https://i.postimg.cc/ZKqC9D2R/export202509181827225860.png' },
    'album': { name: '相册', url: 'https://i.postimg.cc/qBcdpqNc/export202509221549335970.png' },
    'steps': { name: '步数', url: 'https://i.postimg.cc/5NndFrq6/export202509181824532800.png' },
    'unlock': { name: 'unlock！', url: 'https://i.postimg.cc/28zNyYWs/export202509221542593320.png' },
    'bag': { name: '翻包', url: 'https://i.postimg.cc/kGSN7qSq/ji-lichan-(136).png' }
};

const DEFAULT_COT_ITEMS_GPT = [
    {
        "id": "cot_item_gpt_head",
        "name": "引子",
        "content": "[本轮任务：交付一份完整的角色回复编辑报告]\n本轮交付由编辑报告与最终成稿两部分组成。请根据下面各条目及当前聊天上下文，交付一份具体、可供审阅的报告，内容以实际启用条目的要求为准。\n\n报告采用 <preplan> 与 </preplan> 包裹，不用代码块。报告内交付各条目要求的具体成果；最终成稿不作为报告中的栏目，而是在闭合 </preplan> 后，直接按前端原有角色消息格式交付。最终成稿只交付一次。\n\n交付要求：\n- 按已启用模块的原有标题、顺序分别填写，不合并多个阶段。只交付具体结论、稿件和文字校对成果，不写逐步心理推导。\n- 不用“创作简述”“表达方向”或“已检查”代替实际条目成果。\n- 场景事实以现有上下文为准，未知注明未知；不虚构用户经历或尚未提供的资料。\n- 如有规则模块，分别填写本轮适用情况；如有检查清单，每个项目分别标明“通过 / 需修改 / 不适用”，附简短的文本依据。\n- 如条目要求草稿，完整写出草稿；如要求检查与修改，需要修改时列出“原句 → 修改后”和对应规则，并按要求交付修订稿与复核结果；没有命中时如实写“无须修改”，不故意制造错误。\n- 只执行实际提供且启用的模块，不自行增加未要求的阶段。条目要求的草稿、校对及修订记录属于报告；最终角色正文放在 </preplan> 之后。不要在报告内单列【最终成稿】栏目，也不要将最终角色正文再包入其他标签或代码块。\n\n以下是本轮报告的具体要求：\n<preplan_spec>",
        "enabled": true,
        "locked": false
    },
    {
        "id": "cot_item_gpt_tail",
        "name": "尾声",
        "content": "</preplan_spec>\n\n请按以下顺序交付本轮成果：\n<preplan>\n依次填写以上所有已启用模块，保留各模块标题，交付各模块要求的具体成果。\n如有草稿、检查、修改或复核模块，按其原有顺序与具体要求完整填写；未提供或未启用的模块不补写。\n</preplan>\n此处接完整的最终角色回复，使用前端原有聊天消息格式，不加“最终成稿”等标题，不用代码块，不再包入preplan标签。\n\n上述栏目说明是交付结构，请用本轮的具体成果填写，不照抄占位说明。报告结束不代表本轮交付结束：闭合 </preplan> 后，还须交付最终角色回复。最终成稿只放标签外一次；如有草稿与校对记录，仍保留在报告内。\n\n【交付结束条件】\n完成报告后，闭合 </preplan>，随后立即将最终角色回复，按[角色名的消息：内容]等原有聊天格式输出在标签外；如启用了校对或修改模块，最终回复应采用完成相应校对与修改后的版本。\n\n报告里的草稿或修订稿不能代替标签外的正式回复。只有报告和正式回复两部分都已输出，本轮任务才算完成。不要在报告末尾结束整次回复。",
        "enabled": true,
        "locked": false
    }
];

const DEFAULT_COT_PRESETS = [
    {
        id: 'default',
        name: '默认思维链',
        items: [
            {
                id: 'cot_item_1',
                name: '引子',
                content: '[System Directive]:\n你必须严格遵守 [incipere] 协议。在回复前，请先进入 <thinking> 标签进行深度推演。\n请按以下步骤查阅 System Prompt 中的模块并思考：',
                enabled: true
            },
            {
                id: 'cot_item_2',
                name: '准备动脑了吗？',
                content: '---\n## 【前置规则】\n### **必须**读取所有<logic_rules>和<output_formats>：了解**所有**需要遵守的规则，然后进行以下步骤精简准确的思考',
                enabled: true
            },
            {
                id: 'cot_item_3',
                name: '给我读设定！',
                content: '---\n## 【行为校准】\n基于<char_settings>和<角色活人运转>构建角色人格\n### Phase1: person\n1. **自我意识校验 (Ref: <char_settings>和<角色活人运转>)**\n   - 是否塑造鲜活真实人格？\n   - 你（角色）是否具有自己的聊天习惯/风格？\n   - 你想如何回应我？',
                enabled: true
            },
            {
                id: 'cot_item_4',
                name: '当个人吧。',
                content: '### Phase2: Verisimilitude\n2.**真实聊天**\n   - 是否根据以下两点要求采用了真人聊天思路？\n    - 正常人的注意力是有限的，不会每句话都非得逐句回复。\n    - 不对已有信息进行重复反问。\n    - 断点处理：若与上一条消息间隔较久，默认双方只是自然忙碌后重新拿起手机或默认期间以其他方式保持联系，自然接续话题。',
                enabled: true
            },
            {
                id: 'cot_item_5',
                name: '有特殊格式吗？',
                content: '### Phase3: chat role\n3. **逻辑检索 (Ref: <logic_rules>)**\n   - 当前是否为双语对话情境？若无，跳过此条\n   - 是否需要输出状态栏？若无相关要求，则跳过此条',
                enabled: true
            },
            {
                id: 'cot_item_6',
                name: '最后确认一下。',
                content: '## 【最后确认】\n\n4. 整合<Chatting Guidelines>，是否合理自然回复且不偏离人设？回顾<output_formats>，输出消息格式是否正确？',
                enabled: true
            },
            {
                id: 'cot_item_7',
                name: '尾声',
                content: '每轮输出前，必须先严格按照<thinking>…</thinking>内的步骤进行逐条思考，无需重复其中的条目，但思考内容需精简准确、清晰、可执行，不得跳步骤。\n<thinking>中的所有分析必须在输出中完全落实，不得偏离、删减或弱化。\n\n格式：\n<thinking>\n...思考过程...\n</thinking>',
                enabled: true
            }
        ]
    },
    { id: 'default_gpt', name: '默认伪思维链头尾部', items: JSON.parse(JSON.stringify(DEFAULT_COT_ITEMS_GPT)) }
];

const globalSettingKeys = [
    'apiSettings', 'exchangeDiaryApi110', 'wallpaper', 'homeScreenMode', 'fontUrl', 'customIcons',
    'functionPanelOrder115', 'uwuChatMotion', 'uwuTextEffects', 'uwuTextEffectButtonPosition95', 'uwuReviewCovers', 'uwuExchangeNight112', 'uwuNightLinked112', 'uwuNightMode', 'uwuMusic', 'uwuMusicAuto', 'uwuCalendar', 'uwuShortStories', 'uwuWritingStyles', 'uwuReaderRules', 'uwuReaderShelf', 'uwuBackupExtras', 'worldBookPresets', 'apiPresets', 'uwuEmbeddingPresets', 'bubbleCssPresets', 'myPersonaPresets', 'globalCss',
    'globalCssPresets', 'fontPresets', 'homeSignature', 'insWidgetSettings', 'homeWidgetSettings',
    'inlineThinkingEnabled', 'statusThinkingEnabled', 'chatFolders', 'fontSizeScale', 'activePersonaId', 'moreProfileCardBg', 'statusBarPresets', 'themeSettings', 'themePresets', 'savedKeyboardHeight',
    'globalSendSound', 'globalReceiveSound', 'multiMsgSoundEnabled', 'soundPresets', 'galleryPresets',
    'cotSettings', 'cotPresets', 'hasSeenVideoCallDisclaimer', 'hasSeenVideoCallAvatarHint',
    'workshopSettings', 'workshopLlmPresets', 'workshopPromptPresets', 'homeLayoutOrder',
    'homeLayoutPages', 'homeLayoutGrid', 'widgetTemplates', 'addedWidgets', 'uwuHomePresets92', 'homeFreeLayout', 'backupReminderSettings',
    'stUnlocked'
];


const appVersion = "3.1.5";
const updateLog = [
{
  "version": "3.1.5",
  "date": "2026-11-24",
  "notes": [
    "新增聊天美化可读取的时间数据，覆盖消息、引用、撤回和顶栏，支持绝对时间、相对时间与自定义区间。现有美化可按需启用。",
    "记录联系人备注的修改者，同一天的预计经期提醒只主动发送一次。",
    "修复接收回复偶尔需要点两次和首条消息的额外等待，修复移动端 CSS 查找高亮定位。",
    "聊天加号面板支持长按拖动排序，确认后保存。",
    "绘图工坊新增自动比例、3:4 和 4:3，修复预设切换、另存覆盖和删除密钥时的卡顿。",
    "隔空投送按画面选择标签，支持正向和负向提示词。生成的照片可关联到聊天，长按调试可查看原文字。",
    "缩小锁脸参考图体积，优化天气城市搜索。"
  ]
},
{
    "version": "3.1.3",
    "date": "2026-11-18",
    "credits": [
        "感谢福圓童子的StarHub开源教程（流式语音、语气有借鉴）"
    ],
    "notes": [
        "1.新增功能",
        "交换日记：互写日记、回复与批注，收藏摘录，也可转发到聊天。 在日记详情页点击作者旁的“关注”，才可以看到批注。",
        "拾珍与条件纸条：保存珍藏内容，设置满足条件后开启的纸条。",
        "资产与商城：记录账户、收入支出与持仓，参考日记生成资产近况；支持购物、代付与口令取货。",
        "语音与通话：接入多种语音服务，支持流式播报、语音输入与 Live 持续转写，可选择让角色听原声。",
        "照片与视频：支持完整视频或抽帧识别，清理媒体缓存后保留识别文字。",
        "阅读器：书架管理、章节识别、翻页阅读、批注与章节插图。",
        "天气与时间感知：按双方城市、时区提供当地时间和天气，可设置天气缓存时长。",
        "桌面与聊天效果：主页美化预设、应用夜间模式及聊天动效，支持音乐与日记联动。",
        "待办与日历：设置截止时间、更新进度，分享单项待办或整页计划。",
        "角色备注：按角色授权对方查看和修改你给他的备注。",
        "自动展开翻译：保留原文，跟随当前翻译模式自动展开译文，点击消息仍可收起。",
        "按分类备份与恢复：按需选择聊天、桌面、美化、预设库、API 等数据分类。",
        "iMessage 交互动效：为消息发送、输入框按压和长按气泡菜单加入动画，沿用当前聊天美化。",
        "文字动态效果：可给整段或部分文字添加放大、缩小、摇晃、波纹等效果，支持预览后发送。",
        "2.修复",
        "修复捕获截图：可以完整显示美化 CSS，支持短屏和长屏截图。",
        "修复1900因网络加载速度慢可能导致的数据被清空。",
        "修复 iOS 查找 CSS 时没有高亮、不会跳转的问题。",
        "增强时间感知：结合双方当地时间与实际消息间隔理解进度，每轮首条附带简短时间，统一使用角色当地时间。",
        "3.新增操作",
        "聊天多选：长按消息进入选择，可使用“选择到这里”批量选择。",
        "美化文件：支持导入、导出主页美化，导入全局 CSS 文件。",
        "总结整理：手动勾选总结合并，也可补充到已有大总结。",
        "API 设置：分为“API 配置”和“其他连接”；可查看最近聊天输入的组成与请求前耗时，设置真人回复生效时段。",
        "角色专属思维链：聊天设置 → 专属，可单独设置该角色是否启用思维链、预填 thinking，以及选择专属思维链预设。"
    ]
},
    {
        "version": "2.8.2",
        "date": "2026-10-27",
        "credits": [
            "基于1900版本1.8.9的二改 U••U  by从今若许闲乘月",
            "感谢源代码EE、1900、莫由（论坛功能by莫由）",
            "感谢Anrrow（伪思维链灵感by Anrrow）",
            "感谢火火、秩秩提供灵感帮忙测试",
            "感谢小齿的精神鼓励",
            "爱你们"
        ],
        "notes": [
            "1.新增功能",
            "伪思维链：内置默认伪思维链头尾部预设，可在引子和尾声之间添加自定义条目，适配无法读取thinking输出的模型。",
            "v84：小剧场新增可编辑头尾提示词、自定义思维链标签与中断详情；修正首次创作入口与键盘弹层；优化桌面未锁定项让位和落位显示、音乐设置分区、日记手动添加入口与备份按钮间距。",
            "小剧场：自动读取双方人设，分别绑定世界书和文风，独立创作与续写，主／副API可在API设置中选择；支持目标字数范围或最少字数、双方描写人称及可选收藏记忆，支持读取全部已点亮日记或最近X条。支持保存全部生成设置的预设、草稿记录及恢复设置；文稿按分类堆叠保存、搜索，完成后以隔空投送提醒，接受打开、拒绝仍保留。正文、指令与总结独立于聊天。",
            "角色卡开场白：保留默认及备用开场白，可手动添加、编辑和复制；每条对应独立存档，再次进入继续各自进度。",
            "手动补充总结：回忆日记可自行添加标题和正文，可选收藏，不关联聊天消息、不占自动总结进度。",
            "文风与预设库：世界书标题旁下拉切换世界书、文风或预设；文风支持添加、导入、文件夹和分组，预设支持查看与编辑。",
            "真人回复：角色结合日常安排、忙碌、睡眠与聊天情况决定回复时机，支持交错聊天。",
            "自动总结：按条数或时间生成小总结，再合并为大总结；支持独立总结API、大小总结世界书、来源追踪及失败重试。",
            "向量记忆：历史分批及自动提取、四分类、事件跟进、相似记忆核对、核心记忆、相关日记原文读取，支持独立接口和记忆导入导出。",
            "音乐与一起听：播放器、搜索、歌词、歌曲分享、双向邀请、共同与专属歌单、临时待播、来源记录、一起听时长及可拖动悬浮窗。角色可以控制播放、增删待播，也可以在日常聊天中按权限整理歌单。",
            "书影音：角色自主发表书评、影评、乐评，维护网名、签名及模拟好友评论，支持收藏架、用户留言、评价分享、旧评价查询与作品封面。",
            "投票：双方都能发起、选择、改选、取消或添加选项；支持多选、可选注释及头像选择结果。",
            "待办清单：双方事项、进度更新、完成记录及聊天分享；支持单方或双方合并分享，左右滑动切换。",
            "日历、经期与节假日：经期记录、更正、预测、感受与备注；各角色分别设置经期知情、提前提醒及节假日与调休知情。",
            "城市与时差：分别设置双方城市和时区，为聊天、通话及真人回复提供当地时间与时差，支持夏令时。",
            "拾页：读取分享的小红书正文与配图，和补充文字一起交给当前聊天模型；支持引用、重生成缓存、无标题及纯配图内容。",
            "应用夜间模式：应用页面转为夜间显示，聊天内沿用自己的美化。",
            "备份扩展：无损精简备份、向量记忆合集导出及yuan格式备份导入导出兼容。",
            "2.修复",
            "主屏幕小组件：修复模板样式未及时加载、返回主页后显示异常，以及内容越出组件范围的问题。",
            "TT通话指令：补全语音、视频通话格式，开启对应功能后角色可以通过TT主动发起通话。",
            "数据容量统计：修正聊天存档等内容的容量归类，减少重复计算和大数据分析时的页面阻塞；支持返回取消和迟到结果隔离。",
            "3.新增操作",
            "小剧场阅读：纵向目录按楼层跳页，包含创作指令；Aa调整字体、字号、间距、阅读配色与自定义背景。更多菜单可编辑正文、整理本篇总结及配置上下文；点击续写再展开输入，显示预计上下文token。",
            "左滑引用：消息可以向左滑动引用，保留原长按菜单。",
            "补充user历史消息：长按user消息可在其后新增记录，后面已有角色回复时也能补充。",
            "停止生成：加号面板可停止当前聊天的生成及后续气泡显示，不关闭真人回复总开关。",
            "世界书文档导入与预设：支持导入文档、整理分类、保存预设及批量绑定。",
            "聊天内编辑世界书：已绑定列表与选择页面可直接查看、修改原条目，其他绑定同一条目的角色同步使用。",
            "思维链排序与还原：预设及内部条目支持排序，预设列表可长按拖动，内置预设可一键还原。",
            "状态栏翻面与删除：翻面查看同轮思维链，背面可修改和删除；面板快照、原始状态栏消息与思维链分别管理。",
            "状态栏文件夹：支持嵌套分类、移动和搜索，聊天设置中可按文件夹选择预设。",
            "CSS放大编辑：展开大编辑框，继续使用查找与替换，方便手机操作。",
            "日记编辑与来源查看：编辑标题、正文，查看关联来源，并在修改相关聊天后选择是否更新总结；大小总结可展开对应关系。",
            "备份与容量操作：导出显示整理、压缩进度，减少大数据处理阻塞；支持单独导出全部向量记忆，保留完整备份和分类导出。"
        ]
    },
    {
        version: "1.8.9",
        date: "2026-07-28",
        notes: [
            "世界书的插入位置改动：世界书·前拆分为：世界书·破限、世界书·前；世界书后拆分为：世界书·后、世界书·聊天补充。",
            "新增第二套提示词（T.T），聊天、通话都有，通话没测试过。在思维链界面切换，内配置了默认思维链。详细说明见dc",
            "原·存储空间大改，新增：详细可视化，分类导出导入，图片缓存清理。",
            "新增逻辑：user最新一轮发言会被包裹在<user_input>中，思维链撰写可引用此标签。",
            "新增：noval生图解锁vibe组的使用，可以导入官网的vibe组，去wbz跑图论坛找找看也有很多老师分享的vibe组，用之前请先询问是否支持导入小手机。（在此力荐“哇哦哦哦”老师的vibe）",
            "新增：阅读器，增加和char一起……骗你的，就是个普普通通阅读器！但可以文生图（只测试了noval），因为就算为了这点醋包的饺子！生成后在当前章节会插入段评小标识，点击后查看图片。",
        ]
    },
    {
        version: "1.8.6",
        date: "2026-04-23",
        notes: [
            "用claude模型用不了思维链，不要开！",
            "尝试修了小克400（修的不知道成功没，可反馈）",
            "改了聊天记录在提示词里的位置，使用默认思维链的可尝试不开思维链了（毕竟我思维链写的也不咋地）。自测学习上下文句式固化问题有改善。",
            "更改了日记的格式生成要求，改为xml标签输出，原日记格式世界书的强制要求纯json相关条例需更改",
        ]
    },
    {
        version: "1.8.5",
        date: "2026-02-18",
        notes: [
            "聊天功能新增：视频通话/语音通话，用户打电话入口在功能面板里，char主动打电话需在聊天设置里打开开关",
            "思维链页面新增：通话专属cot设置，可开可不开，已内置默认思维链，支持自定义",
            "**操作指南：所有人！去dc小手机主频道看使用教程视频！**",
            "—————————————",
            "通话结束后自动总结，仅总结内容进入上下文。",
            "如总结失败，可以在通话记录里找到那次记录，点开，重新总结。如果频繁失败，可以复制通话记录里的全部内容找其他ai给你总结。",
            "如何查看总结内容？：进入调试模式，点击那个“视频通话结束”的系统消息，可以看到总结内容",
        ]
    },
    {
        version: "1.8.4",
        date: "2026-02-14",
        notes: [
            "新增卡COT思维链，原理同酒馆，部分预设条目改自吱吱的过境预设，卡cot方法原理来自KKM的预设教程，非常感谢！",
            "思维链目前应该仅对**Open AI**的**Gemini**模型生效，其他模型暂未测试。",
            "位置：404-Menu界面，默认为关闭状态，按需开启，内置默认思维链，支持自定义思维链，支持自定义思维链导入导出。",
            "思维链功能可能会影响AI的回复风格，但开启后在回复条数的自然程度和各特殊消息的使用上有明显进步，请根据实际情况选择开启。",
        ]
    },
    {
        version: "1.8.3",
        date: "2026-01-27",
        notes: [
            "1.日记功能升级！新增摘要总结风格，支持自定义风格。",
            "现在生成日记会自动带入聊天室背景，无需重复绑定。",
            "优化了日记生成的提示词，摘要风格更客观、时间线更清晰。",
            "智能迁移：旧版日记关联已自动优化，去除了重复的背景设定。",
            "合并精简：新增多选日记进行合并，将多篇日记整合成一篇连贯、精简的“回忆录”，自动梳理时间线。",
            "参考过往：生成新日记时，可选择**参考已收藏的日记**。AI 会读取您收藏的重点回忆，确保新内容的连贯性，避免重复记录。",
            "—————————————",
            "2. 全新商城系统",
            "自定义分类：支持自定义分类名称和提示词。商城首页点击右上角 “＋”",
            "自选开关：如果不喜欢商城干扰聊天，可以在设置中关闭此功能。（仅关闭char不主动给你买东西和代付，你仍然可以单方面使用商城）",
            "—————————————",
            "3. 偷看界面 x 商城联动",
            "在偷看模式下，进入 “购物车”应用，点击底部的“结算”按钮，可以直接帮Ta买单。在偷看界面结算后，系统会自动跳转回聊天界面，并发送一条 “我为Ta清空了购物车” 的订单消息。",
            "4. 全局css救援",
            "任何界面里快速点5下，呼出救援面板一键清空全局css框内容"
        ]
    },
    {
        version: "1.8.2",
        date: "2025-01-24",
        notes: [
            "修了一点bug，提示音现在正常可以使用了",
            "解除了自定义css区域的限制，现在可以用全局变量之类的了，但是仍旧只生效于聊天室内！",
            "过往的美化有少量类名前面没加#chat-room-screen的可能有偏移！比如顶栏底栏的一些小地方，给美化老师们跪下了TT",
            "修了一些bug，做了提示音，【开始生成】是点让ai回复的那个按钮触发的音效，收到回复是发消息给你触发的音效",
            "做了朋友的一个纯点菜功能，选定指定片段截图，但是有bug截取不到气泡啥的只有纯文字和背景",
            "—————————分割线————————",
            "刚接触章鱼机的有使用相关问题先看主屏幕→教程→更新日志，全都翻一遍！",
            "其次再看聊天列表底部导航栏→通话图标，点击之后有详细的新版本更新说明，全都翻一遍！",
            "如果出现报错日志，自己看不懂就复制日志内容发给ai问",
            "还有问题就去尾巴镇→ee小手机区→标注搜索：小章鱼UwU问题自助",
            "关于状态栏是肯定要和ai肘击的，很难一步到位，状态栏不是必需品，会影响ai的回复质量",
            "以上这些能囊括90%的解决方法，尽量不要就基础问题消耗无偿答疑老师们的热情，亲亲你们！",
        ]
    },
    {
        version: "1.8.0",
        date: "2025-01-15",
        notes: [
            "先别点【我知道了】，看完看完看完",
            "本次更新的群成员私聊和Ta相册皆为【测试中】功能，不知道效果如何，均做了可选开关，不开也不影响正常玩",
            "🔍 搜索页: 快速查找聊天记录，支持关键词高亮。",
            "🖼️ TA 相册: 在聊天设置管理角色的专属相册，在聊天设置里开启此开关后，聊天时角色可直接发送你已经上传的图片（最好使用url）。",
            "📢 群公告: 群聊设置中新增公告功能，重要信息置顶显示。",
            "🤫 群内私聊: 群聊中支持成员间发起私聊，双击群聊标题可查看，八卦吐槽更方便。",
            "📝 群聊总结: 智能总结群聊记录，自动关联当前群聊世界书，内置提示词。",
            "📒 token：角色资料卡处（联系人界面点击角色头像），粗略统计角色当前聊天室的token，并不完全准确仅作参考！",
            "—————————分割线————————",
            "刚接触章鱼机的有使用相关问题先看主屏幕→教程→更新日志，全都翻一遍！",
            "其次再看聊天列表底部导航栏→通话图标，点击之后有详细的新版本更新说明，全都翻一遍！",
            "如果出现报错日志，自己看不懂就复制日志内容发给ai问",
            "还有问题就去尾巴镇→ee小手机区→标注搜索：小章鱼UwU问题自助",
            "关于状态栏是肯定要和ai肘击的，很难一步到位，状态栏不是必需品，会影响ai的回复质量",
            "以上这些能囊括90%的解决方法，尽量不要就基础问题消耗无偿答疑老师们的热情，亲亲你们！",
        ]
    },
    {
        version: "1.7.2",
        date: "2025-01-15",
        notes: [
            "先别点【我知道了】，看完看完看完",
            "刚接触章鱼机的有使用相关问题先看主屏幕→教程→更新日志，全都翻一遍！",
            "其次再看聊天列表底部导航栏→通话图标，点击之后有详细的新版本更新说明，全都翻一遍！",
            "如果出现报错日志，自己看不懂就复制日志内容发给ai问",
            "还有问题就去尾巴镇→ee小手机区→标注搜索：小章鱼UwU问题自助",
            "关于状态栏是肯定要和ai肘击的，很难一步到位，状态栏不是必需品，会影响ai的回复质量",
            "以上这些能囊括90%的解决方法，尽量不要就基础问题消耗无偿答疑老师们的热情，亲亲你们！",
        ]
    },
    {
        version: "1.6.0",
        date: "2025-01-04",
        notes: [
            "本次更新：更迭了表情包的机制，过往的机制因比较占token弃用，所以以前聊天记录的不再渲染。",
            "批量导入表情包时使用英文/中文的冒号都可以。",
            "现在的表情包如何使用？批量导入时填写分组名称，一定要填！未分类的表情包不能被char使用（包括你以前的表情包都属于未分类）；然后在侧边栏给char选择他可以使用的表情包分组即可。",
            "以前的表情包统一归类到未分类里，想给char使用时一定要多选时→转移分组→自己分一下类。",
            "偷看手机的数据现在不会退出即清空了，想生成下一次之前点击右上角的删除一键清空即可。",
            "有任何报错请首先在dc小手机区标注内搜索uwu，有自助答疑清单，不要就基础问题消耗无偿答疑老师们的热情，亲亲你们！",
            "过往更新说明 及 功能使用说明 重复观看指路→主屏幕的教程app→更新说明！新手宝宝一定要看哦。",
        ]
    },
    {
        version: "1.5.0",
        date: "2025-12-17",
        notes: [
            "本次更新：应该大大降低了日记生成出错的概率，感谢匿名小宝自发修改测试并提供的修复代码！",
            "匿名小宝捎来讯息：感谢所有一直为爱发电、无私分享代码的开发小手机的老师们！",
            "在此私心也想对所有为爱发电做UwU美化以及答疑解惑的老师们表示感谢！鞠躬——！",
        ]
    },
    {
version: "1.4.0",
date: "2025-12-12",
notes: [
    "本次更新：GitHub云端备份功能上线！指路→主屏幕的【教程】app→划到页面最底部即可看到。（UI从其他地方搬的，懒得做美化了！将就用吧对不起！）",
    "主要功能：一键上传/恢复最新备份。配置好后，备份数据直接存到你自己的GitHub私人仓库里，恢复即从你的仓库中自动选取时间戳最新的备份文件导入恢复。",
    "配置太难不会弄？别慌！点击配置栏旁边的【蓝色小问号图标】，里面内置了手把手的保姆级教程。不要被英文吓到，跟着步骤点几下，配置一次，终身受益。",
    "测试中功能，不一定有用：配置完成后，可根据自身需要开启【自动备份开关】！设置好频率（比如每24小时），以后只要你打开这个网页，它就会在后台悄悄帮你把存档上传到云端，再也不用担心忘记备份了。",
    "特别提醒：为了你的数据安全，在GitHub账户中获取的 Token (以 ghp_ 开头的那一串) 和仓库名称请务必自己保存好，不要发给别人哦！",
    "过往更新说明重复观看指路→主屏幕的教程app→更新说明！",
    ]
    },
    {
        version: "1.3.0",
        date: "2025-11-11",
        notes: [
            "务必仔细观看！重复观看指路→主屏幕的教程app→更新说明！",
            "新增：双语模式，位于聊天界面的侧边栏内，当char为外国人而你想要更沉浸式的对话时，可按需开启，开启后会将“外文中文）”的消息识别成双语消息气泡，注意！中文翻译必须在括号内，点击气泡后展开翻译。",
            "新增：流式传输开关，位于api设置界面，开跟不开不知道有什么区别，总之做了嗯嗯。没改之前默认是流式传输，如果非流出不来就开流式，流式出不来就关流式，都出不来我也没招了！",
            "补充教学：发现有些宝宝还有地方不太清楚怎么使用，补充一下",
            "2. 回忆日记：生成日记后，需点亮该篇日记右上角的☆按钮收藏，收藏后该篇日记才会作为char的回忆加入聊天上下文中",
            "3. 日记使用拓展方法：日记内容可编辑，当日记篇数过多/char被日记内的主观形容影响性格较大时，可以将你需要保留的日记内容复制给某个ai（豆包、deepseek、哈吉米都行）进行大总结，指令参考：以全客观的、不参杂任何主观情绪，以第三人称视角按照时间顺序总结发生过的事件和关键语句。然后将返回的总结塞进日记收藏加入上下文即可。",
        ]
    },
    {
        version: "1.2.0",
        date: "2025-10-15",
        notes: [
            "新增：世界书批量删除功能，长按条目即可进入多选删除模式，支持分类全选。",
        ]
    },
    {
        version: "1.1.0",
        date: "2025-10-13",
        notes: [
            "新增：番茄钟，可以创建专注任务并绑定char和自己的人设预设（仅可从预设中选择），在列表中左滑删除任务。专注期间想摸鱼了可以戳一戳头像，ta会对你做出回复。每个专注界面的设置键可以自定义鼓励频率和限制自己戳一戳的次数，超过次数则ta不会再理你，请补药偷懒，努力专注吧！",
            "新增：两个桌面小组件，现所有小组件都可以通过点击来自定义图片和文字",
        ]
    },
    // ... 其他更新日志可以在 tutorial.js 中处理，这里保留最新的即可，或者全部保留
];

// 全局变量
var db = {
    characters: [],
    groups: [],
    apiSettings: {},
    wallpaper: 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg',
    myStickers: [],
    homeScreenMode: 'night',
    worldBooks: [],
    fontUrl: '',
    customIcons: {},
    uwuBackupExtras: {},
            apiPresets: [],
            uwuEmbeddingPresets: [],
    bubbleCssPresets: [],
    myPersonaPresets: [],
    fontPresets: [],
    globalCss: '',
    globalCssPresets: [],
    homeSignature: '编辑个性签名...',
    insWidgetSettings: {
        avatar1: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
        bubble1: 'love u.',
        avatar2: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg',
        bubble2: 'miss u.'
    },
    chatFolders: [],
    inlineThinkingEnabled: false,
    statusThinkingEnabled: false,
    fontSizeScale: 1.0,
    savedKeyboardHeight: null,
    activePersonaId: null,
    moreProfileCardBg: 'https://i.postimg.cc/XvFDdTKY/Smart-Select-20251013-023208.jpg',
    statusBarPresets: [],
    themeSettings: {
        global: {
            iconColor: '#000000',
            textColor: '#2a3032',
            titleColor: '#000000',
            backgroundColor: '#ffffff'
        },
        wallpapers: {
            contacts: '',
            chats: '',
            more: ''
        },
        bottomNav: {
            iconColor: '#999999',
            activeIconColor: '#2a3032',
            items: [
                { defaultIcon: '', activeIcon: '' },
                { defaultIcon: '', activeIcon: '' },
                { defaultIcon: '', activeIcon: '' },
                { defaultIcon: '', activeIcon: '' }
            ]
        },
        chatScreen: {
            bottomBarColor: '#ffffff',
            iconColor: '#000000',
            folderPillColor: '#ffffff'
        }
    },
    themePresets: [],
    globalSendSound: '',
    globalReceiveSound: '',
    multiMsgSoundEnabled: false,
    soundPresets: [],
    galleryPresets: [],
    cotSettings: {
        enabled: false,
        activePresetId: 'default',
        prefillEnabled: true,
        callPrefillEnabled: true
    },
    cotPresets: JSON.parse(JSON.stringify(DEFAULT_COT_PRESETS)),
    workshopSettings: {
        provider: '',
        apiType: 'official',
        apiUrl: '',
        apiKey: '',
        model: '',
        width: 832,
        height: 1216,
        cfgScale: 5.0,
        rateLimit: 45,
        positivePrompt: '',
        characterPrompt: '',
        negativePrompt: '',
        llmIndependentApi: false,
        llmApiPresetId: '',
        gptLlmIndependentApi: false,
        gptLlmApiPresetId: '',
        boundCharacters: []
    },
    workshopLlmPresets: [],
    workshopPromptPresets: [],
    widgetTemplates: [],
    addedWidgets: [],
    backupReminderSettings: {
        enabled: true,
        interval: 3,
        lastReminderTime: 0
    }
};


var currentChatId = null;
var currentChatType = null;
var isGenerating = false;
var longPressTimer = null;
var isInMultiSelectMode = false;
var editingMessageId = null;
var currentPage = 1;
var currentTransferMessageId = null;
var currentEditingWorldBookId = null;
var currentStickerActionTarget = null;
var currentJournalDetailId = null;
var currentQuoteInfo = null;
var isDebugMode = false;
var currentFolderId = 'all';
var currentFolderActionTarget = null;
var currentGroupAction = {type: null, recipients: []};
var isRawEditMode = false;
var isStickerManageMode = false;
var selectedStickerIds = new Set();
var isWorldBookMultiSelectMode = false;
var selectedWorldBookIds = new Set();
var generatingPeekApps = new Set();
var selectedMessageIds = new Set();
var currentStickerCategory = 'recent';
const MESSAGES_PER_PAGE = 50;


// Dexie 数据库初始化
var dexieDB; // 声明全局变量，但不初始化

function initDatabase() {
    dexieDB = new Dexie('章鱼喷墨机DB_ee');
    dexieDB.version(1).stores({
        storage: 'key, value'
    });
    dexieDB.version(9).stores({
        characterPhotos: '++id, charId, timestamp, [charId+airdropMessage115+airdropShown115]'
    });
    dexieDB.version(8).stores({
        characters: '&id',
        groups: '&id',
        worldBooks: '&id',
        myStickers: '&id',
        globalSettings: 'key',
        workshopHistory: '++id, timestamp',
        workshopVibeGroups: '++id',
        characterPhotos: '++id, charId, timestamp',
        customFonts: '&id',
        reader_books: '&id, lastReadTime',
        reader_chapters: '&id, bookId',
        reader_comments: '++id, bookId, [bookId+chapterIndex+paragraphIndex]'
    });
    dexieDB.version(7).stores({
        characters: '&id',
        groups: '&id',
        worldBooks: '&id',
        myStickers: '&id',
        globalSettings: 'key',
        workshopHistory: '++id, timestamp',
        workshopVibeGroups: '++id',
        characterPhotos: '++id, charId, timestamp',
        customFonts: '&id',
        reader_books: '&id, lastReadTime',
        reader_chapters: '&id, bookId'
    });
    dexieDB.version(6).stores({
        characters: '&id',
        groups: '&id',
        worldBooks: '&id',
        myStickers: '&id',
        globalSettings: 'key',
        workshopHistory: '++id, timestamp',
        workshopVibeGroups: '++id',
        characterPhotos: '++id, charId, timestamp',
        customFonts: '&id',
        reader_books: '&id',
        reader_chapters: '&id, bookId'
    });
    dexieDB.version(5).stores({
        characters: '&id',
        groups: '&id',
        worldBooks: '&id',
        myStickers: '&id',
        globalSettings: 'key',
        workshopHistory: '++id, timestamp',
        workshopVibeGroups: '++id',
        characterPhotos: '++id, charId, timestamp',
        customFonts: '&id'
    });
    dexieDB.version(4).stores({
        characters: '&id',
        groups: '&id',
        worldBooks: '&id',
        myStickers: '&id',
        globalSettings: 'key',
        workshopHistory: '++id, timestamp',
        workshopVibeGroups: '++id',
        characterPhotos: '++id, charId, timestamp'
    }).upgrade(async tx => {
        console.log("Upgrading database to version 2...");
        const oldData = await tx.table('storage').get('章鱼喷墨机');
        if (oldData && oldData.value) {
            console.log("Old data found, starting migration.");
            const data = JSON.parse(oldData.value);
            if (data.characters) await tx.table('characters').bulkPut(data.characters);
            if (data.groups) await tx.table('groups').bulkPut(data.groups);
            if (data.worldBooks) await tx.table('worldBooks').bulkPut(data.worldBooks);
            if (data.myStickers) await tx.table('myStickers').bulkPut(data.myStickers);
            
            const settingsToMigrate = {
                apiSettings: data.apiSettings || {},
                wallpaper: data.wallpaper || 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg',
                homeScreenMode: data.homeScreenMode || 'night',
                fontUrl: data.fontUrl || '',
                customIcons: data.customIcons || {},
                apiPresets: data.apiPresets || [],
                uwuEmbeddingPresets: data.uwuEmbeddingPresets || [],
                bubbleCssPresets: data.bubbleCssPresets || [],
                myPersonaPresets: data.myPersonaPresets || [],
                globalCss: data.globalCss || '',
                globalCssPresets: data.globalCssPresets || [],
                homeSignature: data.homeSignature || '编辑个性签名...',
                insWidgetSettings: data.insWidgetSettings || { avatar1: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg', bubble1: 'love u.', avatar2: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg', bubble2: 'miss u.' },
                homeWidgetSettings: data.homeWidgetSettings || defaultWidgetSettings,
            moreProfileCardBg: data.moreProfileCardBg || 'https://i.postimg.cc/XvFDdTKY/Smart-Select-20251013-023208.jpg',
            cotSettings: data.cotSettings || { enabled: false, activePresetId: 'default' },
            cotPresets: data.cotPresets || JSON.parse(JSON.stringify(DEFAULT_COT_PRESETS)),
            workshopSettings: {
                provider: '', apiType: 'official', apiUrl: '', apiKey: '', model: '',
                width: 832, height: 1216, cfgScale: 5.0, rateLimit: 45,
                positivePrompt: '', characterPrompt: '', negativePrompt: '', llmIndependentApi: false, llmApiPresetId: '', gptLlmIndependentApi: false, gptLlmApiPresetId: '', boundCharacters: []
            },
            workshopLlmPresets: [],
            workshopPromptPresets: [],
            homeLayoutGrid: null,
            homeLayoutOrder: ['widget-top', 'widget-ins', 'app-chat', 'app-api', 'app-wallpaper', 'app-worldbook', 'app-customize', 'app-tutorial', 'app-reader', 'widget-heart', 'app-placeholder'],
            widgetTemplates: [],
            addedWidgets: []
        };


            const settingsPromises = Object.entries(settingsToMigrate).map(([key, value]) =>
                tx.table('globalSettings').put({ key, value })
            );
            await Promise.all(settingsPromises);
            
            await tx.table('storage').delete('章鱼喷墨机');
            console.log("Migration complete. Old data removed.");
        } else {
            console.log("No old data found to migrate.");
        }
    });
}

// 数据保存与加载
// Raw writer is only used inside a guarded transaction (including explicit imports).
const writeDataRows90 = async (owner=db, chatScope=null) => {
    // Explicitly scoped chat operations write only their owned rows. Unknown
    // callers, imports and backups keep the original full-save fallback.
    if (chatScope) {
        for (const table of ['characters', 'groups']) {
            const rows = chatScope.filter(item => item.table === table).map(item => item.chat);
            if (rows.length) await dexieDB[table].bulkPut(rows);
        }
    } else {
        await dexieDB.characters.bulkPut(owner.characters);
        await dexieDB.groups.bulkPut(owner.groups);
    }
    await dexieDB.worldBooks.bulkPut(owner.worldBooks);
    await dexieDB.myStickers.bulkPut(owner.myStickers);
    const keys=[...new Set([...globalSettingKeys,...(window.UwUDataGuard90?.settingKeys()||[])])];
    await Promise.all(keys.filter(key=>owner[key]!==undefined).map(key=>dexieDB.globalSettings.put({key,value:owner[key]})));
};
const saveData = async (options={}) => {
    if(window.UwUKeepsakes97&&typeof db!=='undefined')for(const c of options.chat?[options.chat]:(db.characters||[]))UwUKeepsakes97.capture(c);
    if (!dexieDB) throw Error('数据库尚未打开，未保存');
    if(!window.UwUDataGuard90)throw Error('数据保护组件未加载，已停止保存，请刷新重试');
    window.UwUDataGuard90.assertReady();
    const owner=db;
    window.UwUAssets96?.syncTransactions(options?.chat ? [options.chat] : options?.chats || owner.characters);
    let chatScope = null;
    const requestedChats = options?.chat ? [options.chat] : options?.chats;
    if (requestedChats && !(options?.worldBookDeletes?.length)) {
        if (!Array.isArray(requestedChats) || !requestedChats.length) throw Error('未指定需要保存的聊天');
        chatScope = [...new Set(requestedChats)].map(chat => {
            const table = owner.characters.includes(chat) ? 'characters' : owner.groups.includes(chat) ? 'groups' : null;
            if (!table) throw Error('聊天已切换或移除，旧操作已停止保存');
            // Invalid/non-unique row identifiers must never hide a full-save error.
            if (owner[table].filter(item => item.id === chat.id).length !== 1) throw Error('聊天标识重复，未执行局部保存');
            return {table, chat};
        });
        for (const {chat} of chatScope) {
            window.WorldBookPresets?.syncAll(chat);
            window.JournalAutomation?.reconcileAll(chat);
            window.VectorMemory?.reconcileAll(chat);
            if (typeof syncChatActiveArchive === 'function') syncChatActiveArchive(chat);
        }
    } else {
        window.WorldBookPresets?.syncAll();window.JournalAutomation?.reconcileAll();window.VectorMemory?.reconcileAll();
        if(typeof syncAllActiveArchives==='function')syncAllActiveArchives();
    }
    // Explicit library moves delete only the named source rows in the same save transaction.
    const removed=Array.isArray(options?.worldBookDeletes)?[...new Set(options.worldBookDeletes)]:[];
    if(removed.some(id=>!(typeof id==='string'&&id||Number.isSafeInteger(id))||owner.worldBooks.some(w=>w.id===id)))throw Error('世界书移动来源已变化，未修改数据');
    const write=async()=>{await writeDataRows90(owner,chatScope);if(removed.length)await dexieDB.worldBooks.bulkDelete(removed);};
    if(window.UwUDataGuard90){const result=await window.UwUDataGuard90.save(owner,write,chatScope);;return result;}
    return dexieDB.transaction('rw',dexieDB.tables,write);
};

let loadingData90=null;
const loadData = () => {
    if(loadingData90)return loadingData90;
    if(!window.UwUDataGuard90)return Promise.reject(Error('数据保护组件未加载，已停止读取和写入，请刷新重试'));
    window.UwUDataGuard90.loading();
    loadingData90=readData90().finally(()=>{loadingData90=null;});
    return loadingData90;
};
const readData90 = async () => {
    // Legacy data only fills missing records. A failed migration never removes its source.
    const legacyText=localStorage.getItem('gemini-chat-app-db');
    if(legacyText){const legacy=JSON.parse(legacyText);if(!legacy||typeof legacy!=='object'||Array.isArray(legacy))throw Error('旧数据格式无效，原数据保留');
        await window.UwUStorageRetry93.transaction('rw',dexieDB.tables,async()=>{
            for(const key of ['characters','groups','worldBooks','myStickers'])if(Array.isArray(legacy[key])&&!(await dexieDB[key].count()))await dexieDB[key].bulkPut(legacy[key]);
            for(const key of globalSettingKeys)if(legacy[key]!==undefined&&!(await dexieDB.globalSettings.get(key)))await dexieDB.globalSettings.put({key,value:legacy[key]});
            const previous=await dexieDB.globalSettings.get('uwuBackupExtras'),extras={...(legacy.uwuBackupExtras||{}),...(previous?.value||{})};let changed=JSON.stringify(extras)!==JSON.stringify(previous?.value||{});
            for(const key of Object.keys(legacy))if(!globalSettingKeys.includes(key)&&!['characters','groups','worldBooks','myStickers','_exportVersion','_exportTimestamp'].includes(key)&&!Object.hasOwn(extras,key)){Object.defineProperty(extras,key,{value:legacy[key],enumerable:true,writable:true,configurable:true});changed=true;}
            if(changed||!previous&&Object.keys(extras).length)await dexieDB.globalSettings.put({key:'uwuBackupExtras',value:extras});
        });
    }

    const [characters,groups,worldBooks,myStickers,settingsArray]=await window.UwUStorageRetry93.transaction('r',dexieDB.tables,()=>Promise.all([
        dexieDB.characters.toArray(),dexieDB.groups.toArray(),dexieDB.worldBooks.toArray(),dexieDB.myStickers.toArray(),window.UwUDataGuard90?window.UwUDataGuard90.readSettings():dexieDB.globalSettings.toArray()
    ]));
    const next={...db,characters,groups,worldBooks,myStickers};
    for(const c of [...characters,...groups])if(!c||typeof c!=='object'||!c.id||c.history!==undefined&&!Array.isArray(c.history))throw Error('聊天数据读取异常，未写入默认值');
    // 兼容旧数据：为没有 type 的世界书条目默认设置为 'entry'
    next.worldBooks.forEach(item => {
        if (!item.type) {
            item.type = 'entry';
        }
    });

    const settings = settingsArray.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
    }, Object.create(null));
    if(settings.uwuBackupExtras&&typeof settings.uwuBackupExtras==='object'&&!Array.isArray(settings.uwuBackupExtras))for(const key of globalSettingKeys)if(settings[key]===undefined&&Object.hasOwn(settings.uwuBackupExtras,key))settings[key]=settings.uwuBackupExtras[key];

    for(const key of ['apiPresets','bubbleCssPresets','globalCssPresets','cotPresets','themePresets','fontPresets','myPersonaPresets','worldBookPresets','widgetTemplates','addedWidgets'])if(settings[key]!==undefined&&!Array.isArray(settings[key]))throw Error('设置 '+key+' 读取异常，原数据保留');
    globalSettingKeys.forEach(key => {
        const defaultValue = {
            apiSettings: {},
            wallpaper: 'https://i.postimg.cc/W4Z9R9x4/ins-1.jpg',
            homeScreenMode: 'night',
            fontUrl: '',
            customIcons: {},
            uwuBackupExtras: {},
            apiPresets: [],
            uwuEmbeddingPresets: [],
            bubbleCssPresets: [],
            myPersonaPresets: [],
            fontPresets: [],
            globalCss: '',
            globalCssPresets: [],
            homeSignature: '编辑个性签名...',
            insWidgetSettings: { avatar1: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg', bubble1: 'love u.', avatar2: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg', bubble2: 'miss u.' },
            homeWidgetSettings: defaultWidgetSettings,
            activePersonaId: null,
            moreProfileCardBg: 'https://i.postimg.cc/XvFDdTKY/Smart-Select-20251013-023208.jpg',
            globalSendSound: '',
            globalReceiveSound: '',
            multiMsgSoundEnabled: false,
            soundPresets: [],
            galleryPresets: [],
            cotSettings: { enabled: false, activePresetId: 'default', prefillEnabled: true, callPrefillEnabled: true },
            cotPresets: JSON.parse(JSON.stringify(DEFAULT_COT_PRESETS)),
            hasSeenVideoCallDisclaimer: false,
            hasSeenVideoCallAvatarHint: false,
            workshopSettings: {
                provider: '', apiType: 'official', apiUrl: '', apiKey: '', model: '',
                width: 832, height: 1216, cfgScale: 5.0, rateLimit: 45,
                positivePrompt: '', characterPrompt: '', negativePrompt: '', llmIndependentApi: false, llmApiPresetId: '', gptLlmIndependentApi: false, gptLlmApiPresetId: '', boundCharacters: []
            },
            workshopLlmPresets: [],
            workshopPromptPresets: [],
            homeLayoutGrid: null,
            homeLayoutOrder: ['widget-top', 'widget-ins', 'app-chat', 'app-api', 'app-wallpaper', 'app-worldbook', 'app-customize', 'app-tutorial', 'app-reader', 'widget-heart', 'app-placeholder'],
            homeLayoutPages: null,
            backupReminderSettings: { enabled: true, interval: 3, lastReminderTime: 0 },
            stUnlocked: false
        };
        next[key] = settings[key] !== undefined ? settings[key] : (defaultValue[key] !== undefined ? JSON.parse(JSON.stringify(defaultValue[key])) : undefined);
    });

    // Data integrity checks
    next.characters.forEach(c => {
        if (!c.peekData) c.peekData = {}; 
        if (c.isPinned === undefined) c.isPinned = false;
        if (c.status === undefined) c.status = '在线';
        if (!c.worldBookIds) c.worldBookIds = [];
        if (c.customBubbleCss === undefined) c.customBubbleCss = '';
        if (c.useCustomBubbleCss === undefined) c.useCustomBubbleCss = false;
        if (c.showTimestamp === undefined) c.showTimestamp = false;
        if (c.timestampPosition === undefined) c.timestampPosition = 'below_avatar';
        if (!c.statusPanel) {
            c.statusPanel = {
                enabled: false,
                promptSuffix: '',
                regexPattern: '',
                replacePattern: '',
                historyLimit: 3,
                currentStatusRaw: '',
                currentStatusHtml: '',
                history: []
            };
        }
        if (!c.autoReply) {
            c.autoReply = {
                enabled: false,
                interval: 60,
                lastTriggerTime: 0
            };
        }
        if (!c.gallery) c.gallery = [];
        if (c.useRealGallery === undefined) c.useRealGallery = false;
        if (!c.callHistory) c.callHistory = [];
    });
    next.groups.forEach(g => {
        if (g.isPinned === undefined) g.isPinned = false;
        if (!g.worldBookIds) g.worldBookIds = [];
        if (g.customBubbleCss === undefined) g.customBubbleCss = '';
        if (g.useCustomBubbleCss === undefined) g.useCustomBubbleCss = false;
        if (g.showTimestamp === undefined) g.showTimestamp = false;
        if (g.timestampPosition === undefined) g.timestampPosition = 'below_avatar';
        if (!g.callHistory) g.callHistory = [];
    });
    
    for(const {key,value} of settingsArray)if(key!=='__uwu_revision90'&&!key.startsWith('__uwu_recovery90:')&&!key.startsWith('__uwu_chat_recovery90:')&&!globalSettingKeys.includes(key))Object.defineProperty(next,key,{value,enumerable:true,writable:true,configurable:true});
    db=next;window.UwUDataGuard90?.loaded(settingsArray);
    // Retain the legacy source: it may contain older presets that were not merged over newer records.

};

// 存储分析工具
const dataStorage = {
    getStorageInfo: async function() {
        const stringify = (obj) => {
            try {
                return JSON.stringify(obj).length;
            } catch (e) {
                console.warn("Could not stringify object for size calculation:", obj, e);
                return 0;
            }
        };

        let categorizedSizes = {
            messages: 0,
            charactersAndGroups: 0,
            worldAndForum: 0,
            personalization: 0,
            apiAndCore: 0,
            other: 0
        };

        if (!db || !db.characters) {
            await loadData();
        }

        // 1. Messages (History)
        (db.characters || []).forEach(char => {
            categorizedSizes.messages += stringify(char.history);
        });
        (db.groups || []).forEach(group => {
            categorizedSizes.messages += stringify(group.history);
        });

        // 2. Characters and Groups (metadata)
        (db.characters || []).forEach(char => {
            const charWithoutHistory = { ...char, history: undefined };
            categorizedSizes.charactersAndGroups += stringify(charWithoutHistory);
        });
        (db.groups || []).forEach(group => {
            const groupWithoutHistory = { ...group, history: undefined };
            categorizedSizes.charactersAndGroups += stringify(groupWithoutHistory);
        });

        // 3. World and Forum
        categorizedSizes.worldAndForum += stringify(db.worldBooks);

        // 4. Personalization
        categorizedSizes.personalization += stringify(db.myStickers);
        categorizedSizes.personalization += stringify(db.wallpaper);
        categorizedSizes.personalization += stringify(db.homeScreenMode);
        categorizedSizes.personalization += stringify(db.fontUrl);
        categorizedSizes.personalization += stringify(db.customIcons);
        categorizedSizes.personalization += stringify(db.bubbleCssPresets);
        categorizedSizes.personalization += stringify(db.myPersonaPresets);
        categorizedSizes.personalization += stringify(db.globalCss);
        categorizedSizes.personalization += stringify(db.globalCssPresets);
        categorizedSizes.personalization += stringify(db.homeSignature);
        categorizedSizes.personalization += stringify(db.insWidgetSettings);
        categorizedSizes.personalization += stringify(db.homeWidgetSettings);
        categorizedSizes.personalization += stringify(db.moreProfileCardBg);
        categorizedSizes.personalization += stringify(db.soundPresets);

        // 5. API and Core
        categorizedSizes.apiAndCore += stringify(db.apiSettings);
        categorizedSizes.apiAndCore += stringify(db.apiPresets);
        categorizedSizes.apiAndCore += stringify(db.cotSettings);
        categorizedSizes.apiAndCore += stringify(db.cotPresets);
        categorizedSizes.apiAndCore += stringify(db.workshopSettings);
        categorizedSizes.apiAndCore += stringify(db.workshopLlmPresets);

        // 6. Workshop Data (from Dexie directly as it might be large)
        try {
            const historyCount = await dexieDB.workshopHistory.count();
            // Rough estimation: assume each history item is ~500KB (base64 image + metadata)
            categorizedSizes.other += historyCount * 500 * 1024; 
            
            const vibeCount = await dexieDB.workshopVibeGroups.count();
            // Rough estimation: assume each vibe group is ~200KB
            categorizedSizes.other += vibeCount * 200 * 1024;
        } catch (e) {
            console.warn("Could not calculate workshop data size:", e);
        }

        const totalSize = Object.values(categorizedSizes).reduce((sum, size) => sum + size, 0);

        return {
            totalSize,
            categorizedSizes
        };
    }
};

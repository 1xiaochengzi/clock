// ===== 徒步路线数据（仅数据，不含逻辑） =====
// 说明：speed 假设成年男性平均徒步速度 5 km/h，
// 每个景点按"距起点公里数"排序，方便后续按时间换算进度。
// imageUrl 为本地占位路径，按景点顺序编号（inca_01 ~ inca_10、tiger_01 ~ tiger_08），
// 图片文件待放入 images/ 文件夹后一一对应替换。

const HIKE_ROUTES = [
  {
    "id": "inca",
    "name": "印加古道",
    "region": "秘鲁 · 安第斯山脉",
    "totalKm": 43,
    "startElevation": 2650,
    "desc": "印加帝国修建的石板朝圣古道，四天翻越高山云林，最终抵达失落之城马丘比丘，被誉为世界上最著名的徒步路线之一。",
    "spots": [
      {
        "name": "82 公里处（起点）",
        "km": 0,
        "elevation": 2650,
        "note": "徒步起点，位于乌鲁班巴河畔的铁路检查站，也是旧时印加路网进入圣谷的入口。",
        "imageUrl": "./images/inca_01.jpg"
      },
      {
        "name": "华拉班巴村",
        "km": 12,
        "elevation": 3000,
        "note": "第一天晚上的营地，山脚下的安静村落，从此处开始将正式爬升进入云雾森林。",
        "imageUrl": "./images/inca_02.jpg"
      },
      {
        "name": "死亡女人山口",
        "km": 20,
        "elevation": 4215,
        "note": "全程最高点，克丘亚语名 Warmiwañusca。翻越此垭口的陡峭爬升是整条古道最具挑战的一段，垭口常挂有祈福石堆。",
        "imageUrl": "./images/inca_03.jpg"
      },
      {
        "name": "帕卡玛约营地",
        "km": 24,
        "elevation": 3600,
        "note": "越过最高垭口后的山谷营地，有古印加梯田遗迹和清凉溪流，是第二天过夜之处。",
        "imageUrl": "./images/inca_04.jpg"
      },
      {
        "name": "隆库拉卡伊遗址",
        "km": 26,
        "elevation": 3800,
        "note": "山顶上的圆形堡垒式建筑，是印加人控守山口与驿道的中途驿站。",
        "imageUrl": "./images/inca_05.jpg"
      },
      {
        "name": "萨亚克马克遗址",
        "km": 32,
        "elevation": 3580,
        "note": "意为『陡峭之地』，需沿崖壁石阶攀行抵达，是保存较完好的山腰祭坛城市。",
        "imageUrl": "./images/inca_06.jpg"
      },
      {
        "name": "云中之城普尤帕塔马克",
        "km": 36,
        "elevation": 3660,
        "note": "建在云雾缭绕的山脊上，拥有印加古道最完整的水渠与梯田系统，常年云雾漫过石阶。",
        "imageUrl": "./images/inca_07.jpg"
      },
      {
        "name": "温纳瓦纳遗址",
        "km": 40,
        "elevation": 2700,
        "note": "意为『永远年轻』，带数十层梯田的大型神庙遗址，是抵达太阳门前最后一个营地。",
        "imageUrl": "./images/inca_08.jpg"
      },
      {
        "name": "太阳门",
        "km": 42,
        "elevation": 2730,
        "note": "朝圣古道的终点关卡，黎明时分从马丘比丘山背后升起的太阳会正好照亮这道石门。",
        "imageUrl": "./images/inca_09.jpg"
      },
      {
        "name": "马丘比丘",
        "km": 43,
        "elevation": 2430,
        "note": "世界新七大奇迹之一，15 世纪印加王帕查库提修建的山顶圣城，1911 年由探险家宾厄姆向世界重新揭示。",
        "imageUrl": "./images/inca_10.jpg"
      }
    ]
  },
  {
    "id": "tigergorge",
    "name": "虎跳峡高路",
    "region": "中国 · 云南 · 香格里拉",
    "totalKm": 22,
    "startElevation": 1800,
    "desc": "金沙江上最深的峡谷，纳西族称其『抚鲁阿仓过』。高路徒步线沿哈巴雪山山腰穿行，俯瞰三千米深的江谷，是国际背包客心中的经典线路。",
    "spots": [
      {
        "name": "桥头镇（起点）",
        "km": 0,
        "elevation": 1800,
        "note": "虎跳峡镇，高路徒步的起点，古时为茶马古道渡口，如今是登山者补给歇脚的集散地。",
        "imageUrl": "./images/tiger_01.jpg"
      },
      {
        "name": "诺余村",
        "km": 4,
        "elevation": 2100,
        "note": "山谷中的纳西族村落，石砌民居依山而建，从这里开始高路正式爬升离开江面。",
        "imageUrl": "./images/tiger_02.jpg"
      },
      {
        "name": "二十八道拐",
        "km": 8,
        "elevation": 2670,
        "note": "全程最高点，连续二十八个之字形急弯一路爬上垭口，转折处可回望金沙江谷，是高路最艰苦也最出名的路段。",
        "imageUrl": "./images/tiger_03.jpg"
      },
      {
        "name": "茶马客栈",
        "km": 12,
        "elevation": 2440,
        "note": "由老马栈改造的山腰客栈，延续茶马古道时期的待客传统，天台上能望见玉龙、哈巴两座雪山。",
        "imageUrl": "./images/tiger_04.jpg"
      },
      {
        "name": "中途客栈",
        "km": 15,
        "elevation": 2340,
        "note": "以『变化多端的云』观景台闻名，悬崖边一排长凳正对峡谷深处，是众多徒步者心中虎跳峡最震撼的取景地。",
        "imageUrl": "./images/tiger_05.jpg"
      },
      {
        "name": "观音瀑布",
        "km": 18,
        "elevation": 2100,
        "note": "从哈巴雪山奔流而下的山涧瀑布，徒步者多在此掬水降温，瀑布下方水声与江声交鸣。",
        "imageUrl": "./images/tiger_06.jpg"
      },
      {
        "name": "中峡（天梯）",
        "km": 20,
        "elevation": 1900,
        "note": "可经垂直天梯下到江边礁石，近距离感受虎跳石惊涛，传说猛虎曾借此礁石一跃过江。",
        "imageUrl": "./images/tiger_07.jpg"
      },
      {
        "name": "核桃园（终点）",
        "km": 22,
        "elevation": 1800,
        "note": "金沙江北岸的江边村落，因百年核桃树成园得名，是高路徒步的终点，可换乘车辆离开峡谷。",
        "imageUrl": "./images/tiger_08.jpg"
      }
    ]
  }
];

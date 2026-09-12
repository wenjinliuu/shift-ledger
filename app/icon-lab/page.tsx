"use client";

import { useMemo, useState } from "react";
import styles from "./styles.module.css";

type Family = "all" | "symbol" | "calendar" | "flat" | "expressive";
type Concept = { id: number; name: string; family: Exclude<Family, "all">; note: string; tone: string };

const concepts: Concept[] = [
  { id: 1, name: "蓝橙交班", family: "symbol", note: "两枚箭头就是白班与夜班，清楚直接", tone: "扁平 · 白底" },
  { id: 2, name: "午夜表盘", family: "symbol", note: "用 24 小时时钟表达倒班与时间", tone: "霓虹 · 深色" },
  { id: 3, name: "无尽昼夜", family: "symbol", note: "太阳和月亮沿无限轨迹持续交替", tone: "柔和 · 天空色" },
  { id: 4, name: "三班轨道", family: "symbol", note: "三条轨道对应早、中、夜三个班次", tone: "专业 · 黑底" },
  { id: 5, name: "循环字标", family: "symbol", note: "把循环的 C 与四个班次节点合成字标", tone: "极简 · 纯白" },
  { id: 6, name: "纸感班表", family: "calendar", note: "像一页真实班表，温和而有生活感", tone: "纸感 · 米白" },
  { id: 7, name: "双页轮换", family: "calendar", note: "两张日历翻页，表达规律不断延续", tone: "活力 · 珊瑚橙" },
  { id: 8, name: "彩色周期格", family: "calendar", note: "用日期色块直接呈现班次序列", tone: "系统感 · 浅灰" },
  { id: 9, name: "月份堆栈", family: "calendar", note: "多个月份连续堆叠，突出长期排班", tone: "层叠 · 冰蓝" },
  { id: 10, name: "极简月历", family: "calendar", note: "只有轮廓与一个重点日期，最克制", tone: "线性 · 黑白" },
  { id: 11, name: "四拍转盘", family: "flat", note: "四段节拍代表工作与休息交替", tone: "几何 · 多彩" },
  { id: 12, name: "班次胶囊", family: "flat", note: "四枚胶囊围绕中心轮换，现代轻快", tone: "扁平 · 钴蓝" },
  { id: 13, name: "时间胶囊", family: "flat", note: "把完整一天压缩成一条昼夜时间轴", tone: "简洁 · 紫色" },
  { id: 14, name: "双色磁贴", family: "flat", note: "白、夜、休、循环四格一眼看懂", tone: "图块 · 纯蓝" },
  { id: 15, name: "日出下班", family: "flat", note: "晨昏越过地平线，强调交接时刻", tone: "插画 · 暖橙" },
  { id: 16, name: "夜班窗口", family: "expressive", note: "从深夜窗口看到下一次日出", tone: "静谧 · 午夜蓝" },
  { id: 17, name: "循环刻度", family: "expressive", note: "精密刻度与状态点，更偏效率工具", tone: "仪表 · 中性灰" },
  { id: 18, name: "班次丝带", family: "expressive", note: "一条连续丝带折出白班、夜班和休息", tone: "品牌感 · 浅色" },
  { id: 19, name: "翻页箭头", family: "expressive", note: "日历右上角翻起，形成自然循环箭头", tone: "清新 · 绿色" },
  { id: 20, name: "液态日历", family: "expressive", note: "保留玻璃质感，但只用一个清晰主符号", tone: "玻璃 · 蓝紫" },
];

const labels: Record<Family, string> = { all: "全部 20 款", symbol: "核心符号", calendar: "日历变化", flat: "扁平构图", expressive: "风格探索" };

function Arrow({ x, y, angle, color, size = 10 }: { x:number; y:number; angle:number; color:string; size?:number }) {
  return <path d={`M${x-size} ${y-size*.72}L${x+size} ${y}L${x-size} ${y+size*.72}Z`} fill={color} transform={`rotate(${angle} ${x} ${y})`}/>;
}

function Sun({ x, y, color = "#FFAF18", r = 10 }: { x:number; y:number; color?:string; r?:number }) {
  return <g><circle cx={x} cy={y} r={r} fill={color}/>{[0,45,90,135].map(a => <line key={a} x1={x-(r+6)*Math.cos(a*Math.PI/180)} y1={y-(r+6)*Math.sin(a*Math.PI/180)} x2={x+(r+6)*Math.cos(a*Math.PI/180)} y2={y+(r+6)*Math.sin(a*Math.PI/180)} stroke={color} strokeWidth="3.5" strokeLinecap="round"/>)}</g>;
}

function Moon({ x, y, color = "#6D4AFF", r = 13, cut = "#fff" }: { x:number; y:number; color?:string; r?:number; cut?:string }) {
  return <g><circle cx={x} cy={y} r={r} fill={color}/><circle cx={x+7} cy={y-5} r={r} fill={cut}/></g>;
}

function Artwork({ concept }: { concept: Concept }) {
  const id = concept.id;
  const shadow = `shadow-${id}`;
  const glass = `glass-${id}`;
  const warm = `warm-${id}`;
  const cool = `cool-${id}`;
  const defs = <defs>
    <filter id={shadow} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#101938" floodOpacity=".22"/></filter>
    <linearGradient id={glass} x1=".1" y1="0" x2=".9" y2="1"><stop stopColor="#FFFFFF" stopOpacity=".96"/><stop offset="1" stopColor="#DFE8FF" stopOpacity=".76"/></linearGradient>
    <linearGradient id={warm} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFD53F"/><stop offset="1" stopColor="#FF7A21"/></linearGradient>
    <linearGradient id={cool} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#27C4FF"/><stop offset=".5" stopColor="#3264F5"/><stop offset="1" stopColor="#8A45F5"/></linearGradient>
  </defs>;
  let art: React.ReactNode;

  switch (id) {
    case 1:
      art = <><rect width="200" height="200" rx="44" fill="#F7F9FC"/><circle cx="100" cy="100" r="58" fill="#fff" stroke="#E8ECF3" strokeWidth="2"/><path d="M54 96A48 48 0 0 1 133 63" fill="none" stroke="#168CFF" strokeWidth="19" strokeLinecap="round"/><Arrow x={139} y={68} angle={42} color="#168CFF"/><path d="M146 104A48 48 0 0 1 67 137" fill="none" stroke="#FF8A24" strokeWidth="19" strokeLinecap="round"/><Arrow x={61} y={132} angle={222} color="#FF8A24"/><circle cx="100" cy="100" r="22" fill="#F1F4F9"/><path d="M100 100V86M100 100L112 108" stroke="#20283A" strokeWidth="6" strokeLinecap="round"/></>;
      break;
    case 2:
      art = <><rect width="200" height="200" rx="44" fill="#070B20"/><circle cx="100" cy="100" r="63" fill="#101735" stroke="#25315A" strokeWidth="2"/>{[0,1,2,3,4,5,6,7,8,9,10,11].map(n => {const a=(n*30-90)*Math.PI/180;return <line key={n} x1={100+48*Math.cos(a)} y1={100+48*Math.sin(a)} x2={100+55*Math.cos(a)} y2={100+55*Math.sin(a)} stroke={n<6?"#33D7FF":"#9B67FF"} strokeWidth="4" strokeLinecap="round"/>})}<path d="M100 100L100 61M100 100L129 119" stroke="#fff" strokeWidth="8" strokeLinecap="round"/><circle cx="100" cy="100" r="9" fill="#20CFFF"/><text x="100" y="154" textAnchor="middle" fill="#7F8AB2" fontSize="12" fontWeight="700">24H</text></>;
      break;
    case 3:
      art = <><rect width="200" height="200" rx="44" fill="#E8F6FF"/><path d="M47 100C47 66 82 64 100 100S153 136 153 100 118 64 100 100 47 136 47 100" fill="none" stroke="#fff" strokeWidth="27" strokeLinecap="round" filter={`url(#${shadow})`}/><path d="M47 100C47 66 82 64 100 100" fill="none" stroke={`url(#${warm})`} strokeWidth="16" strokeLinecap="round"/><path d="M100 100C118 136 153 136 153 100" fill="none" stroke="#5C48DB" strokeWidth="16" strokeLinecap="round"/><Sun x={56} y={99} r={7}/><Moon x={144} y={100} r={10} cut="#5C48DB"/></>;
      break;
    case 4:
      art = <><rect width="200" height="200" rx="44" fill="#11131A"/><circle cx="100" cy="100" r="61" fill="#191C25" stroke="#2E323E" strokeWidth="2"/><path d="M48 82A57 57 0 0 1 140 54" fill="none" stroke="#FFB11B" strokeWidth="10" strokeLinecap="round"/><path d="M151 76A57 57 0 0 1 130 145" fill="none" stroke="#36D0FF" strokeWidth="10" strokeLinecap="round"/><path d="M119 154A57 57 0 0 1 49 119" fill="none" stroke="#8A61FF" strokeWidth="10" strokeLinecap="round"/><circle cx="100" cy="100" r="30" fill="#F6F7FA"/><path d="M100 100V80M100 100L118 111" stroke="#151821" strokeWidth="7" strokeLinecap="round"/><circle cx="100" cy="100" r="7" fill="#151821"/></>;
      break;
    case 5:
      art = <><rect width="200" height="200" rx="44" fill="#fff"/><path d="M142 59A59 59 0 1 0 144 139" fill="none" stroke="#176CF5" strokeWidth="28" strokeLinecap="round"/><Arrow x={145} y={139} angle={-33} color="#176CF5" size={14}/>{[[62,63,"#FFB21A"],[135,64,"#FF6B45"],[61,137,"#34C98F"],[137,136,"#7655E8"]].map(([x,y,c])=><circle key={String(x)+String(y)} cx={Number(x)} cy={Number(y)} r="9" fill={String(c)} stroke="#fff" strokeWidth="4"/>)}<text x="100" y="113" textAnchor="middle" fill="#17213A" fontSize="39" fontWeight="800" fontFamily="-apple-system,sans-serif">C</text></>;
      break;
    case 6:
      art = <><rect width="200" height="200" rx="44" fill="#F4EBDD"/><rect x="39" y="38" width="122" height="130" rx="14" fill="#D9CBB7" transform="rotate(-4 100 103)"/><rect x="43" y="35" width="116" height="130" rx="14" fill="#FFFDF8" filter={`url(#${shadow})`}/><rect x="43" y="35" width="116" height="33" rx="14" fill="#E65E49"/><path d="M43 54H159" stroke="#E65E49" strokeWidth="28"/><text x="61" y="57" fill="#fff" fontSize="13" fontWeight="800">SHIFT</text>{[0,1,2,3,4,5,6,7,8].map(n=><rect key={n} x={59+(n%3)*29} y={82+Math.floor(n/3)*25} width="18" height="14" rx="5" fill={["#F3B54A","#7C92D9","#BFD1EF","#7C92D9","#E9DED0","#F3B54A","#BFD1EF","#BFD1EF","#7C92D9"][n]}/>)}</>;
      break;
    case 7:
      art = <><rect width="200" height="200" rx="44" fill="#FF7B4D"/><rect x="57" y="49" width="97" height="106" rx="23" fill="#D84B38" transform="rotate(8 105 102)"/><rect x="43" y="43" width="101" height="108" rx="23" fill="#fff" filter={`url(#${shadow})`}/><rect x="43" y="43" width="101" height="31" rx="22" fill="#2478F4"/><path d="M43 61H144" stroke="#2478F4" strokeWidth="24"/><path d="M68 102H119M68 122H104" stroke="#CDD8EC" strokeWidth="11" strokeLinecap="round"/><path d="M113 139H137" stroke="#FFE39C" strokeWidth="8" strokeLinecap="round"/><Arrow x={139} y={139} angle={0} color="#FFE39C" size={6}/></>;
      break;
    case 8:
      art = <><rect width="200" height="200" rx="44" fill="#EEF1F5"/><rect x="38" y="38" width="124" height="124" rx="30" fill="#fff" filter={`url(#${shadow})`}/>{[0,1,2,3,4,5,6,7,8,9,10,11].map(n=><rect key={n} x={55+(n%4)*24} y={56+Math.floor(n/4)*29} width="16" height="19" rx="6" fill={["#246EF0","#246EF0","#FFAA20","#E1E6EF","#E1E6EF","#7655E8","#7655E8","#7655E8","#42B889","#E1E6EF","#246EF0","#FFAA20"][n]}/>) }<path d="M57 148C82 161 124 160 144 140" fill="none" stroke="#222A3A" strokeWidth="7" strokeLinecap="round"/><Arrow x={144} y={140} angle={-47} color="#222A3A" size={6}/></>;
      break;
    case 9:
      art = <><rect width="200" height="200" rx="44" fill="#DDEEFF"/><rect x="58" y="34" width="96" height="114" rx="23" fill="#70ABEE" transform="rotate(9 106 91)"/><rect x="48" y="43" width="103" height="114" rx="23" fill="#397FE8" transform="rotate(3 100 100)"/><rect x="39" y="51" width="110" height="116" rx="23" fill="#fff" filter={`url(#${shadow})`}/><rect x="39" y="51" width="110" height="31" rx="22" fill="#102E66"/><path d="M39 69H149" stroke="#102E66" strokeWidth="25"/><text x="58" y="73" fill="#fff" fontSize="13" fontWeight="800">SEP</text>{[0,1,2,3,4,5].map(n=><circle key={n} cx={62+(n%3)*31} cy={104+Math.floor(n/3)*31} r="8" fill={["#FFB323","#377EEE","#377EEE","#7652E5","#DCE4EF","#FFB323"][n]}/>)}</>;
      break;
    case 10:
      art = <><rect width="200" height="200" rx="44" fill="#fff"/><path d="M55 64H145V151H55Z" fill="none" stroke="#171A20" strokeWidth="9" strokeLinejoin="round"/><path d="M55 87H145" stroke="#171A20" strokeWidth="9"/><path d="M76 48V73M124 48V73" stroke="#171A20" strokeWidth="10" strokeLinecap="round"/><rect x="73" y="104" width="22" height="22" rx="5" fill="#FF453A"/><path d="M107 111H129M107 129H129" stroke="#C5CAD3" strokeWidth="7" strokeLinecap="round"/></>;
      break;
    case 11:
      art = <><rect width="200" height="200" rx="44" fill="#FAFAFC"/><g transform="rotate(-45 100 100)"><path d="M100 45A55 55 0 0 1 155 100L128 100A28 28 0 0 0 100 72Z" fill="#FFB11C"/><path d="M155 100A55 55 0 0 1 100 155L100 128A28 28 0 0 0 128 100Z" fill="#FF6854"/><path d="M100 155A55 55 0 0 1 45 100L72 100A28 28 0 0 0 100 128Z" fill="#7557E8"/><path d="M45 100A55 55 0 0 1 100 45L100 72A28 28 0 0 0 72 100Z" fill="#2385F4"/></g><circle cx="100" cy="100" r="16" fill="#fff"/><circle cx="100" cy="100" r="6" fill="#1D2433"/></>;
      break;
    case 12:
      art = <><rect width="200" height="200" rx="44" fill="#145BE7"/><circle cx="100" cy="100" r="24" fill="#fff" opacity=".95"/><path d="M100 100V87M100 100L112 108" stroke="#145BE7" strokeWidth="6" strokeLinecap="round"/>{[[100,51,"#FFD34A",0],[149,100,"#51D6C3",90],[100,149,"#A886FF",180],[51,100,"#fff",270]].map(([x,y,c,a])=><g key={String(a)} transform={`rotate(${a} ${x} ${y})`}><rect x={Number(x)-21} y={Number(y)-10} width="42" height="20" rx="10" fill={String(c)}/><circle cx={Number(x)+11} cy={Number(y)} r="5" fill="#145BE7" opacity=".3"/></g>)}</>;
      break;
    case 13:
      art = <><rect width="200" height="200" rx="44" fill="#7650E8"/><rect x="29" y="72" width="142" height="57" rx="28.5" fill="#fff" filter={`url(#${shadow})`}/><path d="M100 72V129" stroke="#E2E3EC" strokeWidth="2"/><circle cx="66" cy="100" r="18" fill="#FFF0B7"/><Sun x={66} y={100} r={7}/><circle cx="134" cy="100" r="18" fill="#EEE8FF"/><Moon x={134} y={100} r={10} cut="#EEE8FF"/><path d="M52 143H148" stroke="#A98FF2" strokeWidth="7" strokeLinecap="round"/><path d="M72 143H112" stroke="#FFD24A" strokeWidth="7" strokeLinecap="round"/></>;
      break;
    case 14:
      art = <><rect width="200" height="200" rx="44" fill="#0875E8"/><g filter={`url(#${shadow})`}><rect x="38" y="38" width="55" height="55" rx="17" fill="#fff"/><rect x="107" y="38" width="55" height="55" rx="17" fill="#FFD13E"/><rect x="38" y="107" width="55" height="55" rx="17" fill="#94E2D0"/><rect x="107" y="107" width="55" height="55" rx="17" fill="#8367F3"/></g><Sun x={65} y={65} r={7} color="#FF9D1D"/><Moon x={134} y={65} r={10} color="#4230A5" cut="#FFD13E"/><text x="65" y="143" textAnchor="middle" fill="#176A60" fontSize="20" fontWeight="900">R</text><path d="M122 136A14 14 0 0 1 144 124" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round"/><Arrow x={145} y={125} angle={35} color="#fff" size={4}/></>;
      break;
    case 15:
      art = <><rect width="200" height="200" rx="44" fill="#FFF0D8"/><circle cx="100" cy="111" r="42" fill="#FFB323"/><path d="M0 111H200V156Q200 200 156 200H44Q0 200 0 156Z" fill="#F47745"/><path d="M0 111H200" stroke="#D95D37" strokeWidth="4"/><path d="M49 133C74 153 127 153 151 133" fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round"/><Arrow x={151} y={133} angle={-25} color="#fff" size={9}/><path d="M83 81V57M117 81V57" stroke="#D95D37" strokeWidth="8" strokeLinecap="round"/></>;
      break;
    case 16:
      art = <><rect width="200" height="200" rx="44" fill="#071629"/><rect x="39" y="38" width="122" height="125" rx="33" fill="#0E2948" stroke="#244568" strokeWidth="3"/><path d="M100 39V162M40 101H160" stroke="#244568" strokeWidth="3"/><Moon x={119} y={79} r={22} color="#D8D2FF" cut="#0E2948"/><circle cx="65" cy="65" r="3" fill="#72B9FF"/><circle cx="81" cy="80" r="2" fill="#72B9FF"/><path d="M53 135C76 119 124 119 147 135" fill="none" stroke="#FF9D3E" strokeWidth="10" strokeLinecap="round"/><circle cx="100" cy="135" r="10" fill="#FFC44D"/></>;
      break;
    case 17:
      art = <><rect width="200" height="200" rx="44" fill="#E8EAED"/><circle cx="100" cy="100" r="61" fill="#F8F9FA" stroke="#C7CBD2" strokeWidth="2"/>{Array.from({length:16}).map((_,n)=>{const a=(n*22.5-90)*Math.PI/180;return <line key={n} x1={100+48*Math.cos(a)} y1={100+48*Math.sin(a)} x2={100+55*Math.cos(a)} y2={100+55*Math.sin(a)} stroke={n<5?"#FF9F18":n<10?"#3478EB":n<13?"#7B5AE4":"#B9BEC7"} strokeWidth="5" strokeLinecap="round"/>})}<rect x="73" y="72" width="54" height="58" rx="14" fill="#242934"/><path d="M73 88H127" stroke="#4C90F4" strokeWidth="8"/><circle cx="90" cy="108" r="6" fill="#FFB020"/><circle cx="110" cy="108" r="6" fill="#7E61E8"/></>;
      break;
    case 18:
      art = <><rect width="200" height="200" rx="44" fill="#F8F6FF"/><path d="M49 78C72 45 124 43 151 74L129 90C111 70 82 70 68 91Z" fill="#FFC83D"/><path d="M151 74C170 107 150 151 113 160L104 133C127 126 138 106 129 90Z" fill="#FF6F58"/><path d="M113 160C75 166 40 134 49 96L76 101C72 123 86 137 104 133Z" fill="#4D7EF3"/><path d="M49 96C40 89 41 84 49 78L68 91C64 96 62 99 76 101Z" fill="#7655E8"/><circle cx="100" cy="104" r="28" fill="#fff" filter={`url(#${shadow})`}/><path d="M100 104V89M100 104L113 112" stroke="#252B3C" strokeWidth="6" strokeLinecap="round"/></>;
      break;
    case 19:
      art = <><rect width="200" height="200" rx="44" fill="#1C9B73"/><rect x="40" y="40" width="120" height="120" rx="29" fill="#fff" filter={`url(#${shadow})`}/><path d="M40 72H160" stroke="#0E654F" strokeWidth="12"/><path d="M70 32V58M130 32V58" stroke="#fff" strokeWidth="11" strokeLinecap="round"/><path d="M115 40H160V85Z" fill="#A9E4D2"/><path d="M115 40C132 55 145 69 160 85" fill="none" stroke="#0E654F" strokeWidth="7"/><Arrow x={160} y={85} angle={90} color="#0E654F" size={8}/><path d="M64 105H91M64 129H123" stroke="#C8D5D1" strokeWidth="11" strokeLinecap="round"/></>;
      break;
    default:
      art = <><rect width="200" height="200" rx="44" fill={`url(#${cool})`}/><rect x="30" y="29" width="140" height="142" rx="43" fill="#fff" fillOpacity=".18" stroke="#fff" strokeOpacity=".58" strokeWidth="2" filter={`url(#${shadow})`}/><rect x="47" y="48" width="106" height="104" rx="31" fill={`url(#${glass})`}/><path d="M47 78H153" stroke="#fff" strokeWidth="4" opacity=".8"/><path d="M74 39V64M126 39V64" stroke="#fff" strokeWidth="12" strokeLinecap="round"/><path d="M69 117A35 35 0 0 1 124 92" fill="none" stroke="#FFB41E" strokeWidth="12" strokeLinecap="round"/><Arrow x={128} y={96} angle={42} color="#FF9A18" size={8}/><path d="M131 112A35 35 0 0 1 76 137" fill="none" stroke="#7254E8" strokeWidth="12" strokeLinecap="round"/><Arrow x={72} y={133} angle={220} color="#7254E8" size={8}/></>;
  }
  return <svg viewBox="0 0 200 200" role="img" aria-label={`${concept.id} 号 ${concept.name}`}>{defs}{art}</svg>;
}

export default function IconLabPage() {
  const [family, setFamily] = useState<Family>("all");
  const [selected, setSelected] = useState<number[]>([]);
  const visible = useMemo(() => concepts.filter(c => family === "all" || c.family === family), [family]);
  const toggle = (id:number) => setSelected(old => old.includes(id) ? old.filter(x => x !== id) : old.length < 4 ? [...old,id] : [...old.slice(1),id]);
  return <main className={styles.page}>
    <header className={styles.hero}><p className={styles.eyebrow}>SHIFT LEDGER · SECOND EXPLORATION</p><h1>20 个真正不同的方向</h1><p className={styles.intro}>这轮不固定背景、配色或构图。每款先建立一个独立视觉概念，再检查它缩小到桌面尺寸后是否仍然成立。</p></header>
    <nav className={styles.filters} aria-label="图标方案分类">{(Object.keys(labels) as Family[]).map(key => <button key={key} className={family===key?styles.active:""} onClick={()=>setFamily(key)}>{labels[key]}</button>)}</nav>
    {selected.length>0 && <section className={styles.compare}><div><strong>正在对比</strong><span>点击移除，最多 4 款</span></div><div className={styles.compareItems}>{selected.map(id => {const c=concepts[id-1];return <button key={id} onClick={()=>toggle(id)}><i><Artwork concept={c}/></i><span>{String(id).padStart(2,"0")} · {c.name}</span><b>×</b></button>})}</div></section>}
    <section className={styles.grid}>{visible.map(c => {const chosen=selected.includes(c.id);return <article key={c.id} className={`${styles.card} ${chosen?styles.chosen:""}`}><button className={styles.artButton} onClick={()=>toggle(c.id)} aria-pressed={chosen}><div className={styles.art}><Artwork concept={c}/></div><span className={styles.selectMark}>{chosen?"已加入对比":"加入对比"}</span></button><div className={styles.meta}><div className={styles.titleRow}><span>{String(c.id).padStart(2,"0")}</span><h2>{c.name}</h2></div><p>{c.note}</p><div className={styles.micro}><em>{c.tone}</em><i className={styles.s60}><Artwork concept={c}/></i><i className={styles.s40}><Artwork concept={c}/></i></div></div></article>})}</section>
    <footer className={styles.footer}>这一步只选方向。告诉我你喜欢的编号，我再围绕入选方案做比例、材质与 Apple Liquid Glass 分层精修。</footer>
  </main>;
}

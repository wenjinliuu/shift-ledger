"use client";

import { useMemo, useState } from "react";
import styles from "./styles.module.css";

type Family = "all" | "daynight" | "calendar" | "cycle" | "minimal";

type Concept = {
  id: number;
  name: string;
  family: Exclude<Family, "all">;
  note: string;
  palette: [string, string, string, string];
};

const concepts: Concept[] = [
  { id: 1, name: "日夜双环", family: "daynight", note: "最接近原稿，压缩细节、强化循环", palette: ["#168CFF", "#3157F5", "#FFB000", "#7B4DFF"] },
  { id: 2, name: "交班时刻", family: "daynight", note: "太阳与月亮围绕时针交接", palette: ["#08A4F7", "#513CF1", "#FFC21A", "#8B5CF6"] },
  { id: 3, name: "昼夜转盘", family: "daynight", note: "把日历内页变成清晰的昼夜表盘", palette: ["#17B8F5", "#3546E8", "#FFB914", "#7651F4"] },
  { id: 4, name: "晨昏轨道", family: "daynight", note: "地平线式日夜切换，安静耐看", palette: ["#2C9EF4", "#4F46E5", "#FFAF38", "#8B5CF6"] },
  { id: 5, name: "班次三行", family: "calendar", note: "白班、夜班、休息直接落在日历里", palette: ["#179CFF", "#3154E8", "#FFB020", "#7C55EA"] },
  { id: 6, name: "翻页循环", family: "calendar", note: "日历翻页与循环箭头合成一个动作", palette: ["#1597F2", "#3266E8", "#FF9E2D", "#7A4DEA"] },
  { id: 7, name: "四格轮班", family: "calendar", note: "四格分别代表白、白、休、夜的节奏", palette: ["#00A8F0", "#3E52E8", "#FFB11C", "#8B4CEB"] },
  { id: 8, name: "日期脉冲", family: "calendar", note: "用亮起的日期格表达周期正在运行", palette: ["#259AF2", "#4356DE", "#FFB42A", "#7B54F5"] },
  { id: 9, name: "无尽交班", family: "cycle", note: "无限符号连接太阳与月亮", palette: ["#00A5F5", "#3C50E8", "#FFAD1F", "#7C4DFF"] },
  { id: 10, name: "四拍循环", family: "cycle", note: "四段环形节奏，适合表达自定义班制", palette: ["#149EF2", "#315CE6", "#FFAB22", "#8051EF"] },
  { id: 11, name: "循环跑道", family: "cycle", note: "一条连续轨道串联不同班次", palette: ["#03A5F5", "#3C55E8", "#FFB11F", "#7B4FEF"] },
  { id: 12, name: "交替双箭", family: "cycle", note: "上下两段箭头，轮换含义最直接", palette: ["#2098F3", "#3B4FE3", "#FFAA29", "#8250F1"] },
  { id: 13, name: "时间回环", family: "cycle", note: "时钟与回环合体，偏工具属性", palette: ["#159FF5", "#3B50E9", "#FFB020", "#7652ED"] },
  { id: 14, name: "班次堆叠", family: "cycle", note: "三张班次卡依次轮转，层次鲜明", palette: ["#079EF4", "#3B55E7", "#FFAC26", "#8352EF"] },
  { id: 15, name: "极简日轮", family: "minimal", note: "只保留日历、太阳和一段回转弧", palette: ["#168FF0", "#3555E5", "#FFB223", "#7E50EE"] },
  { id: 16, name: "双色轮转", family: "minimal", note: "两个干净色块表达白夜交替", palette: ["#199EF3", "#3B4DE2", "#FFAE25", "#7652ED"] },
  { id: 17, name: "循环字标", family: "minimal", note: "圆角 C 形回环，最适合小尺寸", palette: ["#0B9FF2", "#3655E7", "#FFAF23", "#7C50EF"] },
  { id: 18, name: "四叶班表", family: "minimal", note: "四片叶瓣构成规律而柔和的循环", palette: ["#11A1F2", "#4050E5", "#FFAF22", "#8452F0"] },
  { id: 19, name: "昼夜刻度", family: "minimal", note: "双弧加刻度，克制而有专业感", palette: ["#2299F2", "#3B50E1", "#FFB028", "#8050ED"] },
  { id: 20, name: "原稿精修", family: "daynight", note: "保留原稿信息，重新校准比例与重心", palette: ["#169BFF", "#3151E9", "#FFB000", "#7C45EE"] },
];

const familyLabels: Record<Family, string> = {
  all: "全部 20 款",
  daynight: "日夜主题",
  calendar: "日历结构",
  cycle: "循环符号",
  minimal: "极简识别",
};

function Sun({ x, y, color, small = false }: { x: number; y: number; color: string; small?: boolean }) {
  const r = small ? 7 : 11;
  return <g><circle cx={x} cy={y} r={r} fill={color}/>{!small && [0,45,90,135].map((a)=><line key={a} x1={x-17*Math.cos(a*Math.PI/180)} y1={y-17*Math.sin(a*Math.PI/180)} x2={x+17*Math.cos(a*Math.PI/180)} y2={y+17*Math.sin(a*Math.PI/180)} stroke={color} strokeWidth="4" strokeLinecap="round"/>)}</g>;
}

function Moon({ x, y, color, small = false }: { x: number; y: number; color: string; small?: boolean }) {
  return <path d={small ? `M ${x+7} ${y-8} A 10 10 0 1 0 ${x+7} ${y+8} A 8 8 0 0 1 ${x+7} ${y-8}` : `M ${x+10} ${y-14} A 18 18 0 1 0 ${x+10} ${y+14} A 14 14 0 0 1 ${x+10} ${y-14}`} fill={color}/>;
}

function ArrowHead({ x, y, rotate, color, size = 10 }: { x: number; y: number; rotate: number; color: string; size?: number }) {
  return <path d={`M ${x-size} ${y-size*.72} L ${x+size} ${y} L ${x-size} ${y+size*.72} Z`} fill={color} transform={`rotate(${rotate} ${x} ${y})`}/>;
}

function CalendarShell({ accent, compact = false }: { accent: string; compact?: boolean }) {
  return <g>
    <rect x={compact ? 55 : 41} y={compact ? 51 : 45} width={compact ? 90 : 118} height={compact ? 103 : 120} rx="24" fill="url(#paper)" stroke="rgba(255,255,255,.78)" strokeWidth="2"/>
    <path d={compact ? "M55 79H145" : "M41 78H159"} stroke={accent} strokeWidth="10" opacity=".95"/>
    <rect x={compact ? 76 : 67} y="36" width="12" height="31" rx="6" fill="white"/>
    <rect x={compact ? 112 : 121} y="36" width="12" height="31" rx="6" fill="white"/>
  </g>;
}

function Artwork({ concept }: { concept: Concept }) {
  const [cyan, blue, amber, violet] = concept.palette;
  const i = concept.id;
  const common = <>
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor={cyan}/><stop offset=".53" stopColor={blue}/><stop offset="1" stopColor={violet}/></linearGradient>
      <linearGradient id="paper" x1="0" y1="0" x2=".85" y2="1"><stop stopColor="#FFFFFF"/><stop offset="1" stopColor="#EEF1FF"/></linearGradient>
      <linearGradient id="warm" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#FFD53D"/><stop offset="1" stopColor={amber}/></linearGradient>
      <linearGradient id="cool" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#9984FF"/><stop offset="1" stopColor={violet}/></linearGradient>
      <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#17217A" floodOpacity=".25"/></filter>
      <filter id="soft"><feGaussianBlur stdDeviation="7"/></filter>
    </defs>
    <rect width="200" height="200" rx="45" fill="url(#bg)"/>
    <ellipse cx="58" cy="32" rx="68" ry="38" fill="white" opacity=".14" filter="url(#soft)"/>
  </>;

  let art: React.ReactNode;
  switch (i) {
    case 1: art = <><CalendarShell accent={cyan}/><g filter="url(#shadow)"><path d="M57 124A47 47 0 0 1 136 91" fill="none" stroke="url(#warm)" strokeWidth="17" strokeLinecap="round"/><ArrowHead x={139} y={94} rotate={40} color={amber}/><path d="M143 114A47 47 0 0 1 65 145" fill="none" stroke="url(#cool)" strokeWidth="17" strokeLinecap="round"/><ArrowHead x={61} y={143} rotate={205} color={violet}/></g><Sun x={86} y={120} color={amber} small/><Moon x={114} y={120} color={violet} small/></>;
    case 2: art = <><CalendarShell accent={blue}/><circle cx="100" cy="121" r="38" fill="none" stroke="white" strokeWidth="8" opacity=".65"/><path d="M100 121V92M100 121L128 135" stroke={blue} strokeWidth="8" strokeLinecap="round"/><circle cx="100" cy="121" r="8" fill={blue}/><Sun x={76} y={100} color={amber} small/><Moon x={129} y={108} color={violet} small/><path d="M60 136A46 46 0 0 0 143 137" fill="none" stroke="url(#cool)" strokeWidth="9" strokeLinecap="round"/><ArrowHead x={143} y={137} rotate={20} color={violet} size={7}/></>;
    case 3: art = <><CalendarShell accent={cyan}/><circle cx="100" cy="119" r="41" fill="#F8FAFF"/><path d="M100 78A41 41 0 0 0 100 160Z" fill="#FFF5D9"/><path d="M100 78A41 41 0 0 1 100 160Z" fill="#EEE9FF"/><Sun x={81} y={119} color={amber}/><Moon x={119} y={119} color={violet}/><path d="M62 113A40 40 0 0 1 133 91" fill="none" stroke={amber} strokeWidth="8" strokeLinecap="round"/><ArrowHead x={135} y={94} rotate={42} color={amber} size={7}/><path d="M138 126A40 40 0 0 1 68 148" fill="none" stroke={violet} strokeWidth="8" strokeLinecap="round"/><ArrowHead x={66} y={146} rotate={207} color={violet} size={7}/></>;
    case 4: art = <><CalendarShell accent={blue}/><path d="M58 123H142" stroke="#DDE4FF" strokeWidth="3"/><path d="M65 123A35 35 0 0 1 135 123" fill="#FFF3CB"/><path d="M65 123A35 35 0 0 0 135 123" fill="#EEE7FF"/><Sun x={100} y={111} color={amber}/><Moon x={100} y={139} color={violet} small/><path d="M61 146A48 48 0 0 0 146 125" fill="none" stroke={violet} strokeWidth="9" strokeLinecap="round"/><ArrowHead x={145} y={125} rotate={-42} color={violet} size={7}/></>;
    case 5: art = <><CalendarShell accent={cyan}/>{[[90,amber,46],[119,blue,65],[148,violet,38]].map(([y,c,w],n)=><g key={n}><rect x="57" y={Number(y)-7} width="86" height="15" rx="7.5" fill="#E7ECFA"/><rect x="57" y={Number(y)-7} width={Number(w)} height="15" rx="7.5" fill={String(c)}/></g>)}<path d="M137 139A21 21 0 0 1 119 157" fill="none" stroke={violet} strokeWidth="6" strokeLinecap="round"/><ArrowHead x={118} y={157} rotate={145} color={violet} size={5}/></>;
    case 6: art = <><g filter="url(#shadow)"><rect x="39" y="48" width="122" height="112" rx="26" fill="url(#paper)"/><path d="M39 82H161" stroke={cyan} strokeWidth="12"/><path d="M58 103H101V145H58Z" fill="#FFF0C4"/><path d="M101 103H144V145H101Z" fill="#EEE8FF"/><path d="M101 103L144 145H101Z" fill={violet} opacity=".18"/></g><path d="M56 128A50 50 0 0 1 136 92" fill="none" stroke={amber} strokeWidth="11" strokeLinecap="round"/><ArrowHead x={139} y={95} rotate={42} color={amber} size={8}/><path d="M145 126A49 49 0 0 1 67 157" fill="none" stroke={violet} strokeWidth="11" strokeLinecap="round"/><ArrowHead x={64} y={155} rotate={205} color={violet} size={8}/></>;
    case 7: art = <><CalendarShell accent={blue}/>{[[60,91,amber],[104,91,cyan],[60,129,violet],[104,129,blue]].map(([x,y,c],n)=><rect key={n} x={Number(x)} y={Number(y)} width="36" height="30" rx="10" fill={String(c)} opacity={n===1?.78:.96}/>)}<path d="M52 121A50 50 0 0 1 136 86" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" opacity=".9"/><ArrowHead x={138} y={88} rotate={40} color="white" size={6}/></>;
    case 8: art = <><CalendarShell accent={cyan}/>{[0,1,2,3,4,5].map(n=><rect key={n} x={58+(n%3)*29} y={92+Math.floor(n/3)*33} width="22" height="22" rx="7" fill={n===0?amber:n===4?violet:"#DDE7F8"}/>) }<path d="M63 151C87 166 124 164 140 143" fill="none" stroke={violet} strokeWidth="8" strokeLinecap="round"/><ArrowHead x={140} y={142} rotate={-48} color={violet} size={6}/></>;
    case 9: art = <><path d="M51 100C51 70 82 70 100 100S149 130 149 100 118 70 100 100 51 130 51 100" fill="none" stroke="white" strokeWidth="22" strokeLinecap="round" filter="url(#shadow)"/><path d="M51 100C51 70 82 70 100 100" fill="none" stroke="url(#warm)" strokeWidth="14" strokeLinecap="round"/><path d="M100 100C118 130 149 130 149 100" fill="none" stroke="url(#cool)" strokeWidth="14" strokeLinecap="round"/><Sun x={58} y={100} color={amber} small/><Moon x={142} y={100} color={violet} small/><rect x="76" y="139" width="48" height="28" rx="10" fill="white" opacity=".9"/><path d="M88 147V159M100 147V159M112 147V159" stroke={blue} strokeWidth="5" strokeLinecap="round"/></>;
    case 10: art = <><circle cx="100" cy="104" r="55" fill="none" stroke="white" strokeWidth="18" opacity=".93" filter="url(#shadow)"/>{[[-45,cyan],[45,blue],[135,violet],[225,amber]].map(([a,c],n)=>{const rad=Number(a)*Math.PI/180;return <path key={n} d={`M ${100+55*Math.cos(rad-.55)} ${104+55*Math.sin(rad-.55)} A 55 55 0 0 1 ${100+55*Math.cos(rad+.55)} ${104+55*Math.sin(rad+.55)}`} fill="none" stroke={String(c)} strokeWidth="13" strokeLinecap="round"/>})}<circle cx="100" cy="104" r="28" fill="url(#paper)"/><path d="M100 104V87M100 104L115 113" stroke={blue} strokeWidth="6" strokeLinecap="round"/><circle cx="100" cy="104" r="6" fill={blue}/></>;
    case 11: art = <><rect x="45" y="45" width="110" height="110" rx="42" fill="none" stroke="white" strokeWidth="22" opacity=".92" filter="url(#shadow)"/><path d="M72 45H128" stroke={amber} strokeWidth="14" strokeLinecap="round"/><path d="M155 72V128" stroke={violet} strokeWidth="14" strokeLinecap="round"/><path d="M128 155H72" stroke={blue} strokeWidth="14" strokeLinecap="round"/><path d="M45 128V72" stroke={cyan} strokeWidth="14" strokeLinecap="round"/>{[[72,45,amber],[155,72,violet],[128,155,blue],[45,128,cyan]].map(([x,y,c],n)=><circle key={n} cx={Number(x)} cy={Number(y)} r="8" fill={String(c)} stroke="white" strokeWidth="3"/>)}<CalendarShell accent={blue} compact/></>;
    case 12: art = <><path d="M48 83A58 58 0 0 1 143 65" fill="none" stroke="url(#warm)" strokeWidth="19" strokeLinecap="round"/><ArrowHead x={146} y={68} rotate={43} color={amber}/><path d="M152 117A58 58 0 0 1 57 135" fill="none" stroke="url(#cool)" strokeWidth="19" strokeLinecap="round"/><ArrowHead x={54} y={132} rotate={223} color={violet}/><rect x="70" y="73" width="60" height="54" rx="17" fill="url(#paper)" filter="url(#shadow)"/><path d="M70 91H130" stroke={blue} strokeWidth="8"/><circle cx="89" cy="108" r="7" fill={amber}/><circle cx="111" cy="108" r="7" fill={violet}/></>;
    case 13: art = <><circle cx="100" cy="101" r="60" fill="url(#paper)" filter="url(#shadow)"/><circle cx="100" cy="101" r="44" fill="none" stroke="#DCE5FA" strokeWidth="7"/><path d="M100 101V68M100 101L130 119" stroke={blue} strokeWidth="10" strokeLinecap="round"/><circle cx="100" cy="101" r="9" fill={blue}/><path d="M61 126A48 48 0 0 0 140 130" fill="none" stroke={violet} strokeWidth="10" strokeLinecap="round"/><ArrowHead x={140} y={129} rotate={-28} color={violet} size={7}/><Sun x={68} y={69} color={amber} small/></>;
    case 14: art = <><g transform="rotate(-9 100 100)" filter="url(#shadow)"><rect x="48" y="74" width="104" height="67" rx="18" fill={violet}/><rect x="42" y="64" width="104" height="67" rx="18" fill={amber}/><rect x="36" y="54" width="104" height="67" rx="18" fill="url(#paper)"/><path d="M36 78H140" stroke={cyan} strokeWidth="9"/><circle cx="62" cy="98" r="8" fill={amber}/><rect x="78" y="91" width="44" height="14" rx="7" fill="#DDE5F8"/></g><path d="M57 148A61 61 0 0 0 153 116" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"/><ArrowHead x={153} y={115} rotate={-40} color="white" size={7}/></>;
    case 15: art = <><CalendarShell accent={cyan}/><Sun x={91} y={119} color={amber}/><path d="M60 141A48 48 0 0 0 141 119" fill="none" stroke="url(#cool)" strokeWidth="14" strokeLinecap="round"/><ArrowHead x={141} y={118} rotate={-44} color={violet} size={9}/></>;
    case 16: art = <><circle cx="100" cy="100" r="59" fill="url(#paper)" filter="url(#shadow)"/><path d="M100 48A52 52 0 0 0 100 152Z" fill="#FFF0C8"/><path d="M100 48A52 52 0 0 1 100 152Z" fill="#EAE5FF"/><path d="M58 71A52 52 0 0 1 137 64" fill="none" stroke={amber} strokeWidth="11" strokeLinecap="round"/><ArrowHead x={138} y={65} rotate={30} color={amber} size={7}/><path d="M142 129A52 52 0 0 1 63 136" fill="none" stroke={violet} strokeWidth="11" strokeLinecap="round"/><ArrowHead x={62} y={135} rotate={210} color={violet} size={7}/><Sun x={81} y={101} color={amber}/><Moon x={119} y={101} color={violet}/></>;
    case 17: art = <><path d="M142 67A56 56 0 1 0 145 130" fill="none" stroke="white" strokeWidth="26" strokeLinecap="round" filter="url(#shadow)"/><path d="M142 67A56 56 0 0 0 69 55" fill="none" stroke="url(#warm)" strokeWidth="16" strokeLinecap="round"/><path d="M145 130A56 56 0 0 1 66 145" fill="none" stroke="url(#cool)" strokeWidth="16" strokeLinecap="round"/><ArrowHead x={145} y={130} rotate={-34} color={violet} size={12}/><rect x="79" y="77" width="50" height="50" rx="15" fill="url(#paper)"/><path d="M79 94H129" stroke={blue} strokeWidth="8"/></>;
    case 18: art = <>{[[amber,0],[cyan,90],[violet,180],[blue,270]].map(([c,r],n)=><path key={n} d="M100 100C82 91 78 67 100 55C122 67 118 91 100 100Z" fill={String(c)} transform={`rotate(${r} 100 100)`} opacity=".96"/>)}<circle cx="100" cy="100" r="23" fill="url(#paper)" filter="url(#shadow)"/><path d="M100 100V86M100 100L112 108" stroke={blue} strokeWidth="6" strokeLinecap="round"/></>;
    case 19: art = <><circle cx="100" cy="100" r="58" fill="url(#paper)" filter="url(#shadow)"/><path d="M55 111A47 47 0 0 1 135 66" fill="none" stroke={amber} strokeWidth="15" strokeLinecap="round"/><path d="M145 89A47 47 0 0 1 65 134" fill="none" stroke={violet} strokeWidth="15" strokeLinecap="round"/>{Array.from({length:8}).map((_,n)=>{const a=(-140+n*40)*Math.PI/180;return <line key={n} x1={100+31*Math.cos(a)} y1={100+31*Math.sin(a)} x2={100+38*Math.cos(a)} y2={100+38*Math.sin(a)} stroke={n<4?amber:violet} strokeWidth="4" strokeLinecap="round"/>})}<Sun x={83} y={99} color={amber} small/><Moon x={117} y={101} color={violet} small/></>;
    default: art = <><CalendarShell accent={cyan}/><g filter="url(#shadow)"><path d="M55 126A50 50 0 0 1 137 89" fill="none" stroke="url(#warm)" strokeWidth="18" strokeLinecap="round"/><ArrowHead x={140} y={92} rotate={42} color={amber}/><path d="M145 117A50 50 0 0 1 63 151" fill="none" stroke="url(#cool)" strokeWidth="18" strokeLinecap="round"/><ArrowHead x={60} y={148} rotate={207} color={violet}/></g><path d="M100 89V149" stroke="#DCE2F3" strokeWidth="3"/><Sun x={83} y={120} color={amber}/><Moon x={117} y={120} color={violet}/></>;
  }
  return <svg viewBox="0 0 200 200" role="img" aria-label={`${concept.id} 号 ${concept.name}`}>{common}{art}<path d="M23 28C55 7 135 3 173 24" fill="none" stroke="white" strokeWidth="3" opacity=".22" strokeLinecap="round"/></svg>;
}

export default function IconLabPage() {
  const [family, setFamily] = useState<Family>("all");
  const [selected, setSelected] = useState<number[]>([]);
  const visible = useMemo(() => concepts.filter(c => family === "all" || c.family === family), [family]);
  const toggle = (id: number) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 4 ? [...s, id] : [...s.slice(1), id]);

  return <main className={styles.page}>
    <header className={styles.hero}>
      <div>
        <p className={styles.eyebrow}>SHIFT LEDGER · APP ICON LAB</p>
        <h1>循环班表 · 图标实验室</h1>
        <p className={styles.intro}>以你现有的蓝色日历、昼夜与循环箭头为起点，统一用适合 Apple Liquid Glass 分层制作的几何结构重新探索。</p>
      </div>
      <div className={styles.principles}>
        <span>主体视觉居中</span><span>小尺寸可辨</span><span>可拆分玻璃图层</span>
      </div>
    </header>

    <nav className={styles.filters} aria-label="方案分类">
      {(Object.keys(familyLabels) as Family[]).map(key => <button key={key} className={family === key ? styles.active : ""} onClick={() => setFamily(key)}>{familyLabels[key]}</button>)}
    </nav>

    {selected.length > 0 && <section className={styles.compare}>
      <div><strong>对比区</strong><span>最多保留 4 个方向</span></div>
      <div className={styles.compareItems}>{selected.map(id => { const c=concepts[id-1]; return <button key={id} onClick={()=>toggle(id)}><i><Artwork concept={c}/></i><span>{String(id).padStart(2,"0")} · {c.name}</span><b>×</b></button> })}</div>
    </section>}

    <section className={styles.grid}>
      {visible.map(concept => {
        const isSelected = selected.includes(concept.id);
        return <article key={concept.id} className={`${styles.card} ${isSelected ? styles.chosen : ""}`}>
          <button className={styles.artButton} onClick={() => toggle(concept.id)} aria-pressed={isSelected}>
            <div className={styles.art}><Artwork concept={concept}/></div>
            <span className={styles.selectMark}>{isSelected ? "已加入对比" : "加入对比"}</span>
          </button>
          <div className={styles.meta}>
            <div className={styles.titleRow}><span>{String(concept.id).padStart(2,"0")}</span><h2>{concept.name}</h2></div>
            <p>{concept.note}</p>
            <div className={styles.micro}><span>小尺寸</span><i className={styles.s60}><Artwork concept={concept}/></i><i className={styles.s40}><Artwork concept={concept}/></i></div>
          </div>
        </article>;
      })}
    </section>

    <footer className={styles.footer}><p>选中喜欢的 1–4 款后，把编号告诉我。下一步会精修构图并拆成 Apple Icon Composer 图层。</p></footer>
  </main>;
}

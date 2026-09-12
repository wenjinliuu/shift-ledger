"use client";

import { useState } from "react";
import styles from "./styles.module.css";

type Pattern="dual"|"single"|"c"|"exchange"|"square"|"clean"|"oval"|"segments"|"double"|"focus"|"neon"|"quiet";
type Concept={id:number;name:string;note:string;tone:string;bg:string;back:string;page:string;header:string;a1:string;a2:string;pattern:Pattern;grid:number;dark?:boolean;glass?:boolean};
const concepts:Concept[]=[
  {id:1,name:"双页 · 内双环",note:"保留 10 号双页结构，两段箭头在日历内部交接",tone:"紫色 · 双箭",bg:"#7554DC",back:"#B5A4F5",page:"#F8F7FF",header:"#EBE7FC",a1:"#FFB629",a2:"#6750DA",pattern:"dual",grid:.10,glass:true},
  {id:2,name:"双页 · 单清环",note:"只用一枚完整回转箭头，日期格退成浅色背景",tone:"蓝色 · 单环",bg:"#2378E6",back:"#78ABF1",page:"#F8FBFF",header:"#E6F0FC",a1:"#174B9D",a2:"#174B9D",pattern:"single",grid:.08},
  {id:3,name:"双页 · C 形环",note:"粗壮 C 形箭头成为主标志，日历只负责定义场景",tone:"净白 · 品牌蓝",bg:"#F5F7FB",back:"#DCE5F4",page:"#FFFFFF",header:"#EEF2F8",a1:"#176DF3",a2:"#176DF3",pattern:"c",grid:.05},
  {id:4,name:"双页 · 上下换",note:"上下两条反向箭头表达班次交替，适合小尺寸",tone:"深色 · 高对比",bg:"#0B1427",back:"#263B60",page:"#142846",header:"#203B60",a1:"#46A9FF",a2:"#9A71FF",pattern:"exchange",grid:.10,dark:true},
  {id:5,name:"内嵌 · 圆角方环",note:"循环路线贴合日历内框，结构规整而现代",tone:"珊瑚 · 扁平",bg:"#FF755E",back:"#D84D45",page:"#FFFFFF",header:"#FFE1DA",a1:"#DE4435",a2:"#DE4435",pattern:"square",grid:.06},
  {id:6,name:"内嵌 · 无日期",note:"完全取消日期格，只留下日历与循环两个元素",tone:"绿色 · 极简",bg:"#1D9D75",back:"#117055",page:"#FFFFFF",header:"#DDF4EC",a1:"#087254",a2:"#087254",pattern:"clean",grid:0},
  {id:7,name:"内嵌 · 椭圆环",note:"横向椭圆循环更舒展，弱化传统圆形箭头感",tone:"青蓝 · 轻玻璃",bg:"#19AAB8",back:"#72D2D6",page:"#F7FFFF",header:"#DCF5F5",a1:"#087282",a2:"#087282",pattern:"oval",grid:.06,glass:true},
  {id:8,name:"内嵌 · 分段环",note:"四段颜色表示不同班次，箭头负责串成周期",tone:"浅灰 · 多彩",bg:"#EEF1F5",back:"#D9DEE8",page:"#FFFFFF",header:"#E6EAF2",a1:"#2C7DF0",a2:"#7657E8",pattern:"segments",grid:.04},
  {id:9,name:"内嵌 · 双层环",note:"内外两层轨迹表达短周期组成长期班表",tone:"靛蓝 · 层次",bg:"#3548B8",back:"#6E79DB",page:"#F7F8FF",header:"#E4E6FA",a1:"#3548B8",a2:"#BFC7F6",pattern:"double",grid:.04},
  {id:10,name:"10 号 · 精修",note:"按你选中的 10 号重画：双页玻璃、淡日期格、内循环",tone:"紫色 · 母版",bg:"#7352D8",back:"#B6A5F5",page:"#F8F6FF",header:"#ECE8FC",a1:"#FFB52A",a2:"#674CD1",pattern:"focus",grid:.06,glass:true},
  {id:11,name:"内嵌 · 夜班环",note:"深色玻璃日历，发光循环环作为唯一视觉中心",tone:"午夜 · 发光",bg:"#061328",back:"#173158",page:"#102542",header:"#1D3A61",a1:"#38AFFF",a2:"#795CFF",pattern:"neon",grid:.06,dark:true,glass:true},
  {id:12,name:"内嵌 · 净白环",note:"白色磨砂日历与深色循环箭头，最安静克制",tone:"净白 · 磨砂",bg:"#F4F6F9",back:"#E3E8F0",page:"#FFFFFF",header:"#EFF2F7",a1:"#202A40",a2:"#202A40",pattern:"quiet",grid:.04,glass:true},
];

function Head({x,y,a,c,s=8}:{x:number;y:number;a:number;c:string;s?:number}){return <path d={`M${x-s} ${y-s*.7}L${x+s} ${y}L${x-s} ${y+s*.7}Z`} fill={c} transform={`rotate(${a} ${x} ${y})`}/>}
function Cycle({c}:{c:Concept}){
  switch(c.pattern){
    case"dual":return <><path d="M70 117A32 32 0 0 1 123 94" fill="none" stroke={c.a1} strokeWidth="11" strokeLinecap="round"/><Head x={128} y={98} a={42} c={c.a1}/><path d="M130 111A32 32 0 0 1 77 134" fill="none" stroke={c.a2} strokeWidth="11" strokeLinecap="round"/><Head x={72} y={130} a={222} c={c.a2}/></>;
    case"single":return <><path d="M75 132A34 34 0 1 1 128 130" fill="none" stroke={c.a1} strokeWidth="12" strokeLinecap="round"/><Head x={130} y={129} a={62} c={c.a1}/></>;
    case"c":return <><path d="M126 88A34 34 0 1 0 129 135" fill="none" stroke={c.a1} strokeWidth="15" strokeLinecap="round"/><Head x={132} y={135} a={-32} c={c.a1} s={10}/></>;
    case"exchange":return <><path d="M70 103H128" stroke={c.a1} strokeWidth="11" strokeLinecap="round"/><Head x={133} y={103} a={0} c={c.a1}/><path d="M130 126H72" stroke={c.a2} strokeWidth="11" strokeLinecap="round"/><Head x={67} y={126} a={180} c={c.a2}/></>;
    case"square":return <><path d="M75 89H126Q136 89 136 99V127Q136 137 126 137H74Q64 137 64 127V100Q64 90 74 90" fill="none" stroke={c.a1} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><Head x={73} y={90} a={180} c={c.a1} s={7}/></>;
    case"clean":return <><circle cx="100" cy="113" r="33" fill="#E7F5F0"/><path d="M76 132A33 33 0 1 1 127 132" fill="none" stroke={c.a1} strokeWidth="12" strokeLinecap="round"/><Head x={129} y={131} a={62} c={c.a1}/></>;
    case"oval":return <><path d="M67 113C67 94 82 88 100 88S133 94 133 113 118 138 100 138 67 132 67 113" fill="none" stroke={c.a1} strokeWidth="11" strokeLinecap="round"/><Head x={131} y={124} a={73} c={c.a1}/></>;
    case"segments":return <><path d="M100 81A33 33 0 0 1 132 105" fill="none" stroke="#FFB124" strokeWidth="11" strokeLinecap="round"/><path d="M133 116A33 33 0 0 1 108 144" fill="none" stroke="#F06457" strokeWidth="11" strokeLinecap="round"/><path d="M97 144A33 33 0 0 1 68 121" fill="none" stroke="#7657E8" strokeWidth="11" strokeLinecap="round"/><path d="M67 109A33 33 0 0 1 91 82" fill="none" stroke="#2C7DF0" strokeWidth="11" strokeLinecap="round"/><Head x={94} y={82} a={-10} c="#2C7DF0" s={7}/></>;
    case"double":return <><circle cx="100" cy="113" r="36" fill="none" stroke={c.a2} strokeWidth="7"/><path d="M78 132A29 29 0 1 1 126 130" fill="none" stroke={c.a1} strokeWidth="11" strokeLinecap="round"/><Head x={128} y={129} a={60} c={c.a1}/></>;
    case"focus":return <><circle cx="100" cy="113" r="34" fill="#fff" opacity=".24"/><path d="M73 119A30 30 0 0 1 124 92" fill="none" stroke={c.a1} strokeWidth="11" strokeLinecap="round"/><Head x={128} y={97} a={43} c={c.a1}/><path d="M128 108A30 30 0 0 1 77 135" fill="none" stroke={c.a2} strokeWidth="11" strokeLinecap="round"/><Head x={73} y={130} a={222} c={c.a2}/></>;
    case"neon":return <><circle cx="100" cy="113" r="34" fill="#0B1A30"/><path d="M75 131A32 32 0 1 1 127 129" fill="none" stroke={c.a1} strokeWidth="11" strokeLinecap="round"/><Head x={129} y={128} a={61} c={c.a1}/></>;
    default:return <><circle cx="100" cy="113" r="34" fill="#F3F5F8"/><path d="M75 130A31 31 0 1 1 127 128" fill="none" stroke={c.a1} strokeWidth="11" strokeLinecap="round"/><Head x={129} y={127} a={61} c={c.a1}/></>;
  }
}

function Artwork({concept:c}:{concept:Concept}){
  const sh=`shadow-${c.id}`,gl=`glass-${c.id}`;
  return <svg viewBox="0 0 200 200" role="img" aria-label={`${c.id} 号 ${c.name}`}><defs><filter id={sh} x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#10163C" floodOpacity=".24"/></filter><linearGradient id={gl} x1=".1" y1="0" x2=".9" y2="1"><stop stopColor={c.page} stopOpacity=".98"/><stop offset="1" stopColor={c.dark?"#132D50":"#DCE4FF"} stopOpacity=".8"/></linearGradient></defs><rect width="200" height="200" rx="44" fill={c.bg}/><rect x="61" y="38" width="98" height="109" rx="27" fill={c.back} transform="rotate(8 110 93)"/><g filter={`url(#${sh})`}><rect x="49" y="45" width="102" height="112" rx="27" fill={c.glass?`url(#${gl})`:c.page}/><path d="M49 77H151" stroke={c.header} strokeWidth="13"/><rect x="73" y="34" width="11" height="31" rx="5.5" fill={c.dark?"#86BFFF":"#fff"}/><rect x="116" y="34" width="11" height="31" rx="5.5" fill={c.dark?"#86BFFF":"#fff"}/><g opacity={c.grid}>{[0,1,2,3,4,5,6,7,8].map(n=><rect key={n} x={70+(n%3)*23} y={91+Math.floor(n/3)*22} width="13" height="12" rx="4" fill={c.dark?"#6BB5FF":"#426DE7"}/>)}</g><Cycle c={c}/></g></svg>;
}

export default function IconLabPage(){
  const[selected,setSelected]=useState<number[]>([]),toggle=(id:number)=>setSelected(old=>old.includes(id)?old.filter(x=>x!==id):old.length<4?[...old,id]:[...old.slice(1),id]);
  return <main className={styles.page}><header className={styles.hero}><p className={styles.eyebrow}>SHIFT LEDGER · INTERNAL CYCLE</p><h1>循环，回到日历里面</h1><p className={styles.intro}>第四轮以你选中的 10 号为母版：保留双页日历和轻玻璃层次，让循环箭头进入日历内部并成为视觉主体；日期格降为极淡背景，部分方案完全取消。</p></header>{selected.length>0&&<section className={styles.compare}><div><strong>正在对比</strong><span>最多 4 款</span></div><div className={styles.compareItems}>{selected.map(id=>{const c=concepts[id-1];return <button key={id} onClick={()=>toggle(id)}><i><Artwork concept={c}/></i><span>{String(id).padStart(2,"0")} · {c.name}</span><b>×</b></button>})}</div></section>}<section className={styles.grid}>{concepts.map(c=>{const chosen=selected.includes(c.id);return <article key={c.id} className={`${styles.card} ${chosen?styles.chosen:""}`}><button className={styles.artButton} onClick={()=>toggle(c.id)}><div className={styles.art}><Artwork concept={c}/></div><span className={styles.selectMark}>{chosen?"已加入对比":"加入对比"}</span></button><div className={styles.meta}><div className={styles.titleRow}><span>{String(c.id).padStart(2,"0")}</span><h2>{c.name}</h2></div><p>{c.note}</p><div className={styles.micro}><em>{c.tone}</em><i className={styles.s60}><Artwork concept={c}/></i><i className={styles.s40}><Artwork concept={c}/></i></div></div></article>})}</section><footer className={styles.footer}>这轮只比较日历内部的循环形态。选定后再单独调整箭头粗细、日期格透明度、双页角度与最终配色。</footer></main>;
}

import React,{forwardRef,useId,useLayoutEffect,useRef,useState} from 'react';
import {motion} from 'motion/react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {ResponsiveContainer,Tooltip as RechartsTooltip} from 'recharts';
import {Check} from 'lucide-react';

// shadcn/ui Radix registry foundations; scoped Bump styles, no theme reset.
export const Card=forwardRef(function Card({className='',...props},ref){return <div ref={ref} className={'bsc-card '+className} data-slot="card" {...props}/>;});
export function Badge({tone='green',children,...props}){return <span className={'bsc-badge bsc-badge--'+tone} data-slot="badge" {...props}>{children}</span>;}
export function Button({className='',children,...props}){return <button type="button" className={'bsc-button '+className} data-slot="button" {...props}>{children}</button>;}
export function Switch(props){return <SwitchPrimitive.Root className="bsc-switch" {...props}><SwitchPrimitive.Thumb/></SwitchPrimitive.Root>;}
export function Checkbox(props){return <CheckboxPrimitive.Root className="bsc-checkbox" {...props}><CheckboxPrimitive.Indicator><Check/></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root>;}
export function Progress({value,label}){return <ProgressPrimitive.Root className="bsc-progress" value={value} aria-label={label}><ProgressPrimitive.Indicator asChild><motion.div animate={{x:(value-100)+'%'}} transition={{duration:.55,ease:[.22,1,.36,1]}}/></ProgressPrimitive.Indicator></ProgressPrimitive.Root>;}
export const Tabs=TabsPrimitive.Root, TabsList=TabsPrimitive.List, TabsTrigger=TabsPrimitive.Trigger, TabsContent=TabsPrimitive.Content;
export function Hint({label,children}){return <TooltipPrimitive.Provider delayDuration={300}><TooltipPrimitive.Root><TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger><TooltipPrimitive.Portal><TooltipPrimitive.Content className="bsc-tooltip" sideOffset={8}>{label}</TooltipPrimitive.Content></TooltipPrimitive.Portal></TooltipPrimitive.Root></TooltipPrimitive.Provider>;}
export function ChartContainer({children,label,className=''}){
 const id=useId(),ref=useRef(null),[measurable,setMeasurable]=useState(false);
 useLayoutEffect(()=>{const node=ref.current;if(!node)return;const measure=()=>{const r=node.getBoundingClientRect();setMeasurable(r.width>0&&r.height>0);};const observer=new ResizeObserver(measure);observer.observe(node);measure();return()=>observer.disconnect();},[]);
 return <div ref={ref} className={'bsc-chart '+className} data-chart={id} role="img" aria-label={label}>{measurable&&<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={80}>{children}</ResponsiveContainer>}</div>;
}
export const ChartTooltip=RechartsTooltip;
export function ChartTooltipContent({active,payload,label}){return active&&payload?.length?<div className="bsc-chart-tooltip"><strong>{label}</strong>{payload.map(p=><span key={p.dataKey}>{p.name}<b>{p.value}</b></span>)}</div>:null;}

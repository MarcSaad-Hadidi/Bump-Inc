import React, {createContext,forwardRef,useContext,useId,useState} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {ResponsiveContainer,Tooltip as RechartsTooltip} from 'recharts';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import {DndContext,DragOverlay,MouseSensor,TouchSensor,useDroppable,useSensor,useSensors,closestCenter} from '@dnd-kit/core';
import {SortableContext,useSortable,arrayMove,verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

// Scoped adaptations of the public shadcn/Kibo UI Kanban, shadcn Chart/Sheet
// and Magic UI AnimatedList. Source URLs and MIT notices: ./README.md.
const KanbanContext=createContext(null);
export function KanbanProvider({columns,data,onDataChange,onInteract,children,renderOverlay}) {
  const [active,setActive]=useState(null);
  const sensors=useSensors(useSensor(MouseSensor,{activationConstraint:{distance:5}}),useSensor(TouchSensor,{activationConstraint:{delay:230,tolerance:6}}));
  const overColumn=id=>data.find(item=>item.id===id)?.column ?? columns.find(c=>c.id===id)?.id;
  function move({active:dragged,over},sort=false) {
    if(!over) return;
    const column=overColumn(over.id), item=data.find(x=>x.id===dragged.id);
    if(!column || !item) return;
    if(column===item.column&&!sort)return;
    if(column===item.column&&dragged.id===over.id)return;
    let next=data.map(x=>x.id===item.id?{...x,column}:x);
    const oldIndex=next.findIndex(x=>x.id===item.id), newIndex=next.findIndex(x=>x.id===over.id);
    if(newIndex>=0 && oldIndex!==newIndex)next=arrayMove(next,oldIndex,newIndex);
    onDataChange(next);
  }
  return <KanbanContext.Provider value={{data,active}}><DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll={false}
    onDragStart={({active})=>{onInteract();setActive(active.id);}} onDragOver={move}
    onDragEnd={event=>{move(event,true);setActive(null);}} onDragCancel={()=>setActive(null)}
    accessibility={{screenReaderInstructions:{draggable:'Pour déplacer une demande, utilisez son bouton de statut.'},announcements:{onDragStart:({active})=>`Demande ${active.id} sélectionnée.`,onDragOver:({over})=>over?`Colonne ${COL_NAME(overColumn(over.id))}.`:'En dehors du tableau.',onDragEnd:({over})=>over?`Demande déplacée vers ${COL_NAME(overColumn(over.id))}.`:'Déplacement annulé.',onDragCancel:()=> 'Déplacement annulé.'}}}>
    <div className="bsd-kanban" data-slot="kanban-provider">{columns.map(children)}</div>
    <DragOverlay dropAnimation={{duration:220,easing:'ease-out'}}>{active&&renderOverlay(data.find(x=>x.id===active))}</DragOverlay>
  </DndContext></KanbanContext.Provider>;
  function COL_NAME(id){return columns.find(x=>x.id===id)?.name??id??'';}
}
export function KanbanBoard({id,children,highlight}) {
  const {setNodeRef,isOver}=useDroppable({id});
  return <div ref={setNodeRef} className="bsd-column" data-slot="kanban-board" data-kanban-column={id} data-over={isOver||highlight||undefined}>{children}</div>;
}
export function KanbanHeader(props){return <div className="bsd-column-header" data-slot="kanban-header" {...props}/>;}
export function KanbanCards({id,children}) {
  const {data}=useContext(KanbanContext), cards=data.filter(x=>x.column===id);
  return <SortableContext items={cards.map(x=>x.id)} strategy={verticalListSortingStrategy}><div className="bsd-column-cards" data-slot="kanban-cards">{cards.map(children)}</div></SortableContext>;
}
export function KanbanCard({item,children,animated,reduced,activeRef}) {
  const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:item.id});
  return <div ref={node=>{setNodeRef(node);if(activeRef)activeRef.current=node;}} data-request={item.id}
    style={{transform:CSS.Transform.toString(transform),transition}} className="bsd-card-slot" data-held={isDragging||undefined}>
    <motion.article layout={!reduced} layoutId={animated?'bump-request-'+item.id:undefined}
      className={'bsd-request '+(item.column==='done'?'is-complete ':'')+(animated?'is-featured':'')}
      initial={animated&&!reduced?{opacity:0,scale:.96}:false} animate={{opacity:isDragging ? .25 : 1,scale:1}}
      transition={{layout:{duration:reduced?0:.95,ease:[.22,1,.36,1]},opacity:{duration:.25}}}>
      <div className="bsd-card-handle" {...attributes} {...listeners} role="group" tabIndex={-1} title="Glisser cette demande">{children}</div>
    </motion.article>
  </div>;
}

export function AnimatedList({children,count,reduced,className=''}) {
  const items=React.Children.toArray(children).slice(0,count);
  return <div className={className} data-slot="animated-list"><AnimatePresence initial={!reduced}>{items.map(item=><motion.div key={item.key}
    layout={!reduced} initial={reduced?false:{y:12,scale:.97,opacity:0}} animate={{y:0,scale:1,opacity:1}} exit={{opacity:0,scale:.97}}
    transition={{type:'spring',stiffness:350,damping:40}}>{item}</motion.div>)}</AnimatePresence></div>;
}

const ChartContext=createContext(null);
export const ChartContainer=forwardRef(function ChartContainer({config,children,className='',...props},ref) {
  const id='bump-chart-'+useId().replaceAll(':','');
  return <ChartContext.Provider value={config}><div ref={ref} className={'bsd-chart '+className} data-chart={id} {...props}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={80}>{children}</ResponsiveContainer>
  </div></ChartContext.Provider>;
});
export const ChartTooltip=RechartsTooltip;
export function ChartTooltipContent({active,payload,label}) {
  const config=useContext(ChartContext);
  if(!active || !payload?.length)return null;
  return <div className="bsd-chart-tooltip"><strong>{label}</strong>{payload.map(x=><span key={x.dataKey}><i style={{background:x.color}}/>{config?.[x.dataKey]?.label??x.name}<b>{x.value}</b></span>)}</div>;
}
export const Sheet=SheetPrimitive.Root;
export const SheetTitle=SheetPrimitive.Title;
export const SheetDescription=SheetPrimitive.Description;
export const SheetClose=SheetPrimitive.Close;
export const SheetTrigger=SheetPrimitive.Trigger;
// Deliberately inline and nonmodal: the assistant complements the dashboard.
// No document portal, overlay, focus grab, scroll lock or full-screen sheet.
export const SheetContent=forwardRef(function SheetContent({children,reduced,...props},ref){
  return <SheetPrimitive.Content asChild forceMount ref={ref}
    onOpenAutoFocus={e=>e.preventDefault()} onCloseAutoFocus={e=>e.preventDefault()}
    onInteractOutside={e=>e.preventDefault()} {...props}>
    <motion.aside className="bsd-assistant" initial={reduced?false:{opacity:0,x:20,y:8}}
      animate={{opacity:1,x:0,y:0}} exit={{opacity:0,x:12,y:4}} transition={{duration:reduced?0:.55,ease:[.22,1,.36,1]}}>{children}</motion.aside>
  </SheetPrimitive.Content>;
});

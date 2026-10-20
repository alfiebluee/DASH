import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core"
import { KeyboardSensor } from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { motion } from "framer-motion"
import { useState } from "react"
import { selectFocus } from "../../lib/focus.ts"
import { rise, stagger } from "../../lib/motion.ts"
import { useCommands } from "../../lib/commands.ts"
import type { StudioSnapshot } from "../../lib/studio.tsx"
import { BottomSpacer, Page } from "./Page.tsx"
import { Header } from "./Header.tsx"
import { FocusCard } from "./FocusCard.tsx"
import { StageBoard } from "./StageBoard.tsx"
import { Timeline } from "./Timeline.tsx"
import { PipelinePanel, Pulse, UpNext } from "./BottomRow.tsx"

const collision: CollisionDetection = (args) => {
  const pointed = pointerWithin(args)
  return pointed.length > 0 ? pointed : closestCenter(args)
}

export function DashboardView({ snapshot, now }: { snapshot: StudioSnapshot; now: Date }) {
  const commands = useCommands()
  const focus = selectFocus(snapshot.projects, commands.ui.sessionFocusId)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const dragging = snapshot.projects.find((project) => project.id === activeId || `idea:${project.id}` === activeId)

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    if (!event.over) return
    void commands.drop(String(event.active.id), String(event.over.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={(event) => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={onDragEnd}
    >
      <Page>
        <Header now={now} settings={snapshot.settings} showGreeting />
        <motion.div variants={stagger} initial="hidden" animate="show" className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
          <motion.div variants={rise} className="h-full min-w-0 lg:col-span-5">
            <FocusCard project={focus} settings={snapshot.settings} now={now} />
          </motion.div>
          <motion.div variants={rise} className="h-full min-w-0 lg:col-span-7">
            <StageBoard
              projects={snapshot.projects}
              events={snapshot.events}
              settings={snapshot.settings}
              focusId={focus?.id ?? null}
              now={now}
            />
          </motion.div>
        </motion.div>
        <motion.div variants={rise} initial="hidden" animate="show" className="mt-6">
          <Timeline projects={snapshot.projects} events={snapshot.events} weeks={snapshot.settings.timelineWeeks} now={now} />
        </motion.div>
        <motion.div variants={stagger} initial="hidden" animate="show" className="mt-6 grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
          <motion.div variants={rise} className="min-w-0">
            <UpNext projects={snapshot.projects} events={snapshot.events} now={now} />
          </motion.div>
          <motion.div variants={rise} className="min-w-0">
            <PipelinePanel projects={snapshot.projects} events={snapshot.events} />
          </motion.div>
          <motion.div variants={rise} className="min-w-0">
            <Pulse projects={snapshot.projects} events={snapshot.events} settings={snapshot.settings} now={now} />
          </motion.div>
        </motion.div>
        <BottomSpacer />
      </Page>
      <DragOverlay>
        {dragging ? (
          <div className="rounded-2xl bg-white px-3 py-2 text-[13px] font-medium shadow-lift">{dragging.name}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { getEvents } from "../api/events"
import type { Event } from "../types"
import EventCard from "../components/EventCard"
import PageTransition from "../components/PageTransition"
import { EventCardSkeleton } from "../components/Skeleton"
import { useDebounce } from "../hooks/useDebounce"

const CATEGORIES = ["sport", "food", "travel", "culture", "family", "contest", "music"]

const CATEGORY_LABELS: Record<string, string> = {
  sport: "運動", food: "美食", travel: "旅遊",
  culture: "文藝", family: "親子", contest: "競賽", music: "音樂",
}

type SortOption =
  | "recommended"
  | "tickets_asc"
  | "tickets_desc"
  | "popular"
  | "status_registering"
  | "status_waitlist"
  | "status_closed"

const SORT_LABELS: Record<SortOption, string> = {
  recommended:        "為你推薦",
  status_registering: "報名中",
  status_waitlist:    "候補中",
  status_closed:      "報名截止",
  popular:            "最熱門",
  tickets_asc:        "名額最少",
  tickets_desc:       "名額最多",
}

function sortEvents(events: Event[], sort: SortOption): Event[] {
  const sorted = [...events]
  switch (sort) {
    case "tickets_asc":
      return sorted
        .filter(e => e.status === "registering")
        .sort((a, b) => (a.remainingTickets ?? 0) - (b.remainingTickets ?? 0))
    case "tickets_desc":
      return sorted
        .filter(e => e.status === "registering")
        .sort((a, b) => (b.remainingTickets ?? 0) - (a.remainingTickets ?? 0))
    case "popular":
      return sorted.sort((a, b) => {
        const aRate = a.ticketLimit ? (a.ticketLimit - a.remainingTickets) / a.ticketLimit : 0
        const bRate = b.ticketLimit ? (b.ticketLimit - b.remainingTickets) / b.ticketLimit : 0
        return bRate - aRate
      })
    case "status_registering":
      return sorted.filter(e => e.status === "registering")
    case "status_waitlist":
      return sorted.filter(e => e.status === "waitlist")
    case "status_closed":
      return sorted.filter(e => e.status === "closed")
    case "recommended":
    default: {
      const userTags: string[] = JSON.parse(localStorage.getItem("userTags") ?? "[]")
      return sorted.sort((a, b) => {
        const aMatch = userTags.includes(a.category) ? 1 : 0
        const bMatch = userTags.includes(b.category) ? 1 : 0
        return bMatch - aMatch
      })
    }
  }
}

function EventListPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState("")   // 顯示在 input 的即時值
  const [keyword, setKeyword] = useState("")          // 真正打 API 的值（debounced）
  const [category, setCategory] = useState("")
  const [sort, setSort] = useState<SortOption>("recommended")

  // 搜尋框 400ms 後才觸發 API，避免每個字都打一次
  const debouncedSetKeyword = useDebounce((val: string) => {
    setKeyword(val)
  }, 400)

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value)
    debouncedSetKeyword(e.target.value)
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    getEvents({ keyword, category }, controller.signal)
      .then(res => {
        setEvents(res.data)
        setLoading(false)
      })
      .catch(err => {
        if (err.name === "AbortError") return  // 正常取消，不更新 state
        setLoading(false)
      })

    return () => controller.abort()
  }, [keyword, category])

  const filtered = sortEvents(events, sort)

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">活動列表</h1>

        <div className="flex flex-col gap-3 mb-6">
          <input
            placeholder="搜尋活動..."
            value={inputValue}
            onChange={handleSearchChange}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
          >
            <option value="">所有類別</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(SORT_LABELS) as SortOption[]).map(option => (
              <button
                key={option}
                onClick={() => setSort(option)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sort === option
                    ? "bg-white text-zinc-900"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
                }`}
              >
                {SORT_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => <EventCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-4xl mb-3">🔍</p>
            <p>沒有符合的活動</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((event, index) => (
                <motion.div
                  key={event.eventId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <EventCard
                    event={event}
                    onClick={() => navigate(`/events/${event.eventId}`)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageTransition>
  )
}

export default EventListPage
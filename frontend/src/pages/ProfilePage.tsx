import { useState, useEffect } from "react"
import { getMe } from "../api/auth"
import { updateUser } from "../api/users"
import type { User } from "../types"
import PageTransition from "../components/PageTransition"

const CATEGORIES = [
  { value: "sport",   label: "🏃 運動" },
  { value: "food",    label: "🍽️ 美食" },
  { value: "travel",  label: "✈️ 旅遊" },
  { value: "culture", label: "🎨 文藝" },
  { value: "family",  label: "👨‍👩‍👧 親子" },
  { value: "contest", label: "🏆 競賽" },
  { value: "music",   label: "🎵 音樂" },
]

function ProfilePage() {
  const role = localStorage.getItem("role")

  const [user, setUser]               = useState<User | null>(null)
  const [loading, setLoading]         = useState(true)
  const [loadError, setLoadError]     = useState(false)
  const [tags, setTags]               = useState<string[]>([])
  const [dietType, setDietType]       = useState<"veg" | "non-veg" | null>(null)
  const [selfDriving, setSelfDriving] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [saveError, setSaveError]     = useState("")

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    getMe(controller.signal)
      .then(data => {
        setUser(data)
        setTags(data.tags)
        setDietType(data.dietType)
        setSelfDriving(data.selfDriving ?? false)
        setLoading(false)
      })
      .catch(err => {
        if (err.name === "AbortError") return
        setLoadError(true)
        setLoading(false)
      })

    return () => controller.abort()
  }, [])

  function toggleTag(tag: string) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaveError("")
    try {
      await updateUser(user.userId, {
        preferences: tags,
        autofill: { dietType, selfDriving },
      })
      localStorage.setItem("userTags", JSON.stringify(tags))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaveError("儲存失敗，請稍後再試")
    } finally {
      setSaving(false)
    }
  }

  function getRoleLabel(r: string | null) {
    if (r === "welfare_member") return "福委會"
    if (r === "hr") return "HR"
    return "一般員工"
  }

  if (loading) return (
    <div className="text-center py-16 text-zinc-500">載入中...</div>
  )

  if (loadError || !user) return (
    <div className="text-center py-16 text-zinc-500">載入失敗，請重新整理</div>
  )

  return (
    <PageTransition>
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">個人資料</h1>

      <div className="flex flex-col gap-4">

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <p className="text-white font-semibold">{user.username}</p>
              {user.email && (
                <p className="text-zinc-400 text-sm">{user.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-zinc-800">
            <span className="text-zinc-500 text-sm">角色</span>
            <span className="text-white text-sm">{getRoleLabel(role)}</span>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-zinc-800">
            <span className="text-zinc-500 text-sm">報名狀態</span>
            {user.registrationStatus === "active" ? (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-400">正常</span>
            ) : (
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-red-900/30 text-red-400">
                鎖定中{user.unlockAt && `（${new Date(user.unlockAt).toLocaleDateString("zh-TW")} 解鎖）`}
              </span>
            )}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-1">活動偏好</h3>
          <p className="text-zinc-500 text-sm mb-4">選擇你有興趣的活動類別</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const isSelected = tags.includes(cat.value)
              return (
                <button
                  key={cat.value}
                  onClick={() => toggleTag(cat.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-white text-zinc-900"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-1">報名自動填入</h3>
          <p className="text-zinc-500 text-sm mb-4">報名活動時自動帶入以下資料</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-zinc-400 text-sm block mb-2">飲食需求</label>
              <select
                value={dietType ?? ""}
                onChange={e => setDietType(e.target.value as "veg" | "non-veg" | null || null)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500"
              >
                <option value="">無需求</option>
                <option value="veg">素食</option>
                <option value="non-veg">葷食</option>
              </select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setSelfDriving(!selfDriving)}
                className={`w-10 h-6 rounded-full transition-colors relative ${selfDriving ? "bg-emerald-500" : "bg-zinc-700"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${selfDriving ? "left-5" : "left-1"}`} />
              </div>
              <span className="text-zinc-300 text-sm">自行開車</span>
            </label>
          </div>
        </div>

        {saveError && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
            {saveError}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-semibold transition-colors"
        >
          {saved ? "✓ 已儲存" : saving ? "儲存中..." : "儲存"}
        </button>
      </div>
    </div>
    </PageTransition>
  )
}

export default ProfilePage
import type { SaveSlotSummary } from '@/game/save'
import { Tooltip } from '@/components/Tooltip'
import {
  TT_CHANGE_API,
  TT_CLEAR_SLOT,
  TT_ENTER_REALM,
  TT_LOAD_SLOT,
  TT_NEW_GAME_ALL,
  TT_SAVE_MANUAL,
  TT_SELECT_SLOT,
} from '@/content/playerTooltips'

export interface RealmPick {
  id: string
  name: string
}

interface Props {
  summaries: SaveSlotSummary[]
  activeSlot: number
  onSelectSlot: (slot: number) => void
  onLoadSlot: (slot: number) => void
  onSaveCurrent: () => void
  onClearSlot: (slot: number) => void
  onNewGameAll: () => void
  realms: RealmPick[]
  currentRealmId: string | null
  onEnterRealm: (realmId: string) => void
  realmSwitchBusy?: boolean
  /** Clear stored key and reopen the API Key gate (browser + Electron). */
  onChangeApiKey?: () => void
}

export function InteractionBox({
  summaries,
  activeSlot,
  onSelectSlot,
  onLoadSlot,
  onSaveCurrent,
  onClearSlot,
  onNewGameAll,
  realms,
  currentRealmId,
  onEnterRealm,
  realmSwitchBusy,
  onChangeApiKey,
}: Props) {
  const multiRealm = realms.length > 1
  return (
    <div className="flex flex-col gap-4" style={{ fontSize: 'var(--dot-size)' }}>
      {multiRealm ? (
        <div>
          <p className="text-[var(--dot-text)] mb-2">换界</p>
          <p className="text-[var(--dot-muted)] m-0 mb-2">
            保留命烛、根脚、鉴照、害、物证、线索与卷轴，从该界入口节点继续。
          </p>
          <ul className="list-none m-0 p-0 space-y-2">
            {realms.map((r) => {
              const here = r.id === currentRealmId
              return (
                <li
                  key={r.id}
                  className={`flex flex-wrap items-center gap-2 p-2 border border-[var(--ui-frame-outer)] ${here ? 'ring-1 ring-[var(--dot-accent-dim)]' : ''}`}
                >
                  <span className="text-[var(--dot-text)]">{r.name}</span>
                  <span className="text-[var(--dot-muted)] text-sm">{r.id}</span>
                  {here ? (
                    <span className="text-[var(--dot-muted)] ml-auto">当前界</span>
                  ) : (
                    <Tooltip content={TT_ENTER_REALM}>
                      <button
                        type="button"
                        className="ui-btn px-3 py-1 text-sm ml-auto"
                        disabled={realmSwitchBusy}
                        onClick={() => onEnterRealm(r.id)}
                      >
                        前往
                      </button>
                    </Tooltip>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      <p className="text-[var(--dot-muted)] m-0">当前写入档位：{activeSlot + 1}</p>
      {onChangeApiKey ? (
        <Tooltip content={TT_CHANGE_API}>
          <button type="button" className="ui-btn px-4 py-2 w-full" onClick={onChangeApiKey}>
            API 与模型…
          </button>
        </Tooltip>
      ) : null}
      <Tooltip content={TT_SAVE_MANUAL}>
        <button type="button" className="ui-btn px-4 py-2 w-full" onClick={onSaveCurrent}>
          手动存档（当前进度）
        </button>
      </Tooltip>
      <div>
        <p className="text-[var(--dot-text)] mb-2">存档位</p>
        <ul className="list-none m-0 p-0 space-y-2">
          {summaries.map((s) => (
            <li
              key={s.slot}
              className={`flex flex-wrap items-center gap-2 p-2 border border-[var(--ui-frame-outer)] ${s.slot === activeSlot ? 'ring-1 ring-[var(--dot-accent)]' : ''}`}
            >
              <span className="text-[var(--dot-text)]">#{s.slot + 1}</span>
              {s.empty ? (
                <span className="text-[var(--dot-muted)]">空</span>
              ) : (
                <span className="text-[var(--dot-muted)]">
                  界 {s.realmId ?? '？'} · 异史 {s.yishiCount} · 步 {s.stepsTaken}
                </span>
              )}
              <Tooltip content={TT_SELECT_SLOT}>
                <button type="button" className="ui-btn px-2 py-1 text-sm ml-auto" onClick={() => onSelectSlot(s.slot)}>
                  选用
                </button>
              </Tooltip>
              {!s.empty && (
                <>
                  <Tooltip content={TT_LOAD_SLOT}>
                    <button type="button" className="ui-btn px-2 py-1 text-sm" onClick={() => onLoadSlot(s.slot)}>
                      读取
                    </button>
                  </Tooltip>
                  <Tooltip content={TT_CLEAR_SLOT}>
                    <button type="button" className="ui-btn px-2 py-1 text-sm" onClick={() => onClearSlot(s.slot)}>
                      删除
                    </button>
                  </Tooltip>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      <Tooltip content={TT_NEW_GAME_ALL}>
        <button type="button" className="ui-btn px-4 py-2 w-full border-red-800 text-red-300" onClick={onNewGameAll}>
          清空全部存档并新游戏
        </button>
      </Tooltip>
    </div>
  )
}

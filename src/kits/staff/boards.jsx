/* boards.jsx — Staff portal: departmental work boards. CONFIDENTIAL · internal.

   One board per department so a team can see WHO IS ON WHAT. That is the actual point,
   so "By person" is the default view rather than a kanban: the failure this fixes is two
   people quietly doing the same job while a third thing nobody picked up goes unnoticed,
   and a column of cards answers that far less directly than a list per colleague.

   Everyone in the department sees the whole board. Anyone can add a task and move their
   own; reassigning someone else's work and deleting are lead actions, enforced server
   side — this screen only mirrors that so the buttons don't lie. */
import React from 'react';
import { Card, SectionHead, Btn, Pill, Icon, Avatar, Modal, EmptyState } from './ui.jsx';
import { useDialogs } from './dialogs.jsx';
import { fetchTasks, saveTask, setTaskStatus, deleteTask, useStaffClaims, DEPT_LABEL } from './service.js';

const { useState, useEffect, useCallback, useMemo } = React;

const STATUS_META = {
  todo: { label: 'To do', tone: 'off', icon: 'circle' },
  in_progress: { label: 'In progress', tone: 'warn', icon: 'spinner' },
  blocked: { label: 'Blocked', tone: 'bad', icon: 'circle-exclamation' },
  done: { label: 'Done', tone: 'ok', icon: 'circle-check' },
};
const STATUS_ORDER = ['todo', 'in_progress', 'blocked', 'done'];
const PRIORITY_TONE = { urgent: 'bad', high: 'warn', normal: 'ok', low: 'off' };

const today = () => new Date().toISOString().slice(0, 10);

const dueMeta = (d) => {
  if (!d) return null;
  const t = today();
  if (d < t) return { text: `Overdue — ${d}`, tone: 'bad' };
  if (d === t) return { text: 'Due today', tone: 'warn' };
  return { text: `Due ${d}`, tone: 'off' };
};

/* ── Add / edit ───────────────────────────────────────────────────────────── */
function TaskModal({ task, department, members, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    title: task?.title || '',
    detail: task?.detail || '',
    assigneeUid: task?.assigneeUid || '',
    priority: task?.priority || 'normal',
    status: task?.status || 'todo',
    dueDate: task?.dueDate || '',
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (f.title.trim().length < 3) { setErr('Give the task a title.'); return; }
    setBusy(true); setErr(null);
    try {
      await saveTask({ id: task?.id, department, ...f, assigneeUid: f.assigneeUid || null });
      onSaved();
      onClose();
    } catch (e) { setErr(e.message || 'Could not save.'); }
    finally { setBusy(false); }
  };

  return (
    <Modal
      title={task ? 'Edit task' : 'New task'}
      subtitle={DEPT_LABEL[department] || department}
      icon="clipboard-list"
      onClose={onClose}
      maxWidth={560}
      footer={
        <div className="flex justify-end gap-2">
          <Btn kind="ghost" size="sm" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn kind="primary" size="sm" icon="check" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : task ? 'Save' : 'Add task'}
          </Btn>
        </div>
      }
    >
      <div className="space-y-3">
        <input className="ym-input" style={{ width: '100%' }} placeholder="What needs doing?"
          value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus />
        <textarea className="ym-input" style={{ width: '100%', minHeight: 90 }}
          placeholder="Any detail worth having (optional)"
          value={f.detail} onChange={(e) => set('detail', e.target.value)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold t3">
            Assigned to
            {/* Picked from the department's own people rather than typed — the server
                resolves the uid against staff/{uid} anyway, so a typed name could never
                have matched a real person. */}
            <select className="ym-input" style={{ width: '100%' }}
              value={f.assigneeUid} onChange={(e) => set('assigneeUid', e.target.value)}>
              <option value="">Nobody yet</option>
              {members.map((m) => <option key={m.uid} value={m.uid}>{m.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold t3">
            Due
            <input type="date" className="ym-input" style={{ width: '100%' }}
              value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </label>
          <label className="text-xs font-semibold t3">
            Priority
            <select className="ym-input" style={{ width: '100%' }}
              value={f.priority} onChange={(e) => set('priority', e.target.value)}>
              {['low', 'normal', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold t3">
            Status
            <select className="ym-input" style={{ width: '100%' }}
              value={f.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
          </label>
        </div>

        {err && <div className="text-sm" style={{ color: 'var(--red)' }}><Icon name="circle-exclamation" /> {err}</div>}
      </div>
    </Modal>
  );
}

/* ── One task row ─────────────────────────────────────────────────────────── */
function TaskRow({ t, onEdit, onMove, onDelete, canDelete, showAssignee }) {
  const due = dueMeta(t.dueDate);
  const next = t.status === 'done' ? 'todo' : t.status === 'todo' ? 'in_progress' : 'done';
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderTop: '1px solid var(--line)' }}>
      <button
        onClick={() => onMove(t, next)}
        title={t.status === 'done' ? 'Reopen' : `Move to ${STATUS_META[next].label}`}
        style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, marginTop: 2, color: 'var(--pri)' }}
      >
        <Icon name={t.status === 'done' ? 'circle-check' : 'circle'} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="font-semibold t1 text-sm"
          style={t.status === 'done' ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>
          {t.title}
        </div>
        {t.detail && <div className="text-xs t3" style={{ whiteSpace: 'pre-wrap' }}>{t.detail}</div>}
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <Pill tone={STATUS_META[t.status]?.tone || 'off'}>{STATUS_META[t.status]?.label || t.status}</Pill>
          {t.priority !== 'normal' && <Pill tone={PRIORITY_TONE[t.priority]}>{t.priority}</Pill>}
          {due && <Pill tone={due.tone}>{due.text}</Pill>}
          {showAssignee && (
            <span className="text-xs t3">
              {t.assigneeName ? <>· {t.assigneeName}</> : <>· <i>unassigned</i></>}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1">
        <Btn kind="ghost" size="sm" icon="pen" onClick={() => onEdit(t)}>Edit</Btn>
        {canDelete && <Btn kind="ghost" size="sm" icon="trash" onClick={() => onDelete(t)}>Delete</Btn>}
      </div>
    </div>
  );
}

/* ── Screen ───────────────────────────────────────────────────────────────── */
export function Boards() {
  const { departments = [], isAdmin, tier } = useStaffClaims();
  const [dept, setDept] = useState(null);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('person');       // person | status
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new
  const dialogs = useDialogs();

  // Default to the caller's first department once claims resolve.
  useEffect(() => { if (!dept && departments.length) setDept(departments[0]); }, [departments, dept]);

  const load = useCallback(async () => {
    if (!dept) return;
    setLoading(true);
    try { setData(await fetchTasks(dept)); setErr(null); }
    catch (e) { setErr(e.message || 'Could not load the board.'); }
    finally { setLoading(false); }
  }, [dept]);
  useEffect(() => { load(); }, [load]);

  const tasks = data?.tasks || [];
  const members = data?.members || [];
  const canDelete = isAdmin || tier === 'lead';

  const visible = useMemo(
    () => (showDone ? tasks : tasks.filter((t) => t.status !== 'done')),
    [tasks, showDone],
  );

  // Who is on what — the question this screen exists to answer. Unassigned goes LAST
  // but is never hidden: work nobody has picked up is the thing most worth seeing.
  const byPerson = useMemo(() => {
    const groups = new Map();
    for (const m of members) groups.set(m.uid, { uid: m.uid, name: m.name, tasks: [] });
    for (const t of visible) {
      const key = t.assigneeUid || '__none';
      if (!groups.has(key)) groups.set(key, { uid: key, name: t.assigneeName || 'Unassigned', tasks: [] });
      groups.get(key).tasks.push(t);
    }
    const list = [...groups.values()];
    const none = list.filter((g) => g.uid === '__none');
    return [...list.filter((g) => g.uid !== '__none').sort((a, b) => b.tasks.length - a.tasks.length), ...none];
  }, [visible, members]);

  const move = async (t, status) => {
    // Optimistic: the click should feel instant, and a failure reloads the truth.
    setData((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status } : x)) }));
    try { await setTaskStatus(t.id, status); } catch (e) { dialogs.toast?.({ text: e.message, tone: 'bad' }); }
    load();
  };

  const remove = async (t) => {
    const ok = await dialogs.confirm({
      title: 'Delete this task?',
      body: `"${t.title}" will be removed from the ${DEPT_LABEL[dept] || dept} board for everyone.`,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try { await deleteTask(t.id); load(); } catch (e) { dialogs.toast?.({ text: e.message, tone: 'bad' }); }
  };

  const openTasks = tasks.filter((t) => t.status !== 'done');
  const overdue = openTasks.filter((t) => t.dueDate && t.dueDate < today());
  const unassigned = openTasks.filter((t) => !t.assigneeUid);

  return (
    <div className="fadeup space-y-6">
      <SectionHead
        icon="clipboard-list"
        title="Work board"
        sub="Who in the department is on what — and what nobody has picked up"
        action={<Btn kind="primary" size="sm" icon="plus" onClick={() => setEditing(null)} disabled={!dept}>New task</Btn>}
      />

      <div className="flex items-center gap-2 flex-wrap">
        {(isAdmin ? Object.keys(DEPT_LABEL) : departments).map((d) => (
          <Btn key={d} kind={d === dept ? 'primary' : 'ghost'} size="sm" onClick={() => setDept(d)}>
            {DEPT_LABEL[d] || d}
          </Btn>
        ))}
      </div>

      {!!openTasks.length && (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <Pill tone="ok">{openTasks.length} open</Pill>
          {!!overdue.length && <Pill tone="bad">{overdue.length} overdue</Pill>}
          {!!unassigned.length && <Pill tone="warn">{unassigned.length} unassigned</Pill>}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Btn kind={view === 'person' ? 'primary' : 'ghost'} size="sm" icon="users" onClick={() => setView('person')}>By person</Btn>
        <Btn kind={view === 'status' ? 'primary' : 'ghost'} size="sm" icon="list-check" onClick={() => setView('status')}>By status</Btn>
        <Btn kind="ghost" size="sm" icon={showDone ? 'eye-slash' : 'eye'} onClick={() => setShowDone((v) => !v)}>
          {showDone ? 'Hide done' : 'Show done'}
        </Btn>
      </div>

      {err && <Card className="p-6 text-sm" style={{ color: 'var(--red)' }}><Icon name="circle-exclamation" /> {err}</Card>}
      {loading && !data && <Card className="p-6 t3 text-sm">Loading board…</Card>}

      {!loading && !err && !visible.length && (
        <EmptyState icon="clipboard-list" title="Nothing on this board yet."
          sub="Add the first task — everyone in the department will see it." />
      )}

      {!err && !!visible.length && view === 'person' && (
        <div className="space-y-4">
          {byPerson.filter((g) => g.tasks.length || g.uid !== '__none').map((g) => (
            <Card key={g.uid} className="p-5">
              <div className="flex items-center gap-3 mb-1">
                {g.uid === '__none'
                  ? <Icon name="circle-question" />
                  : <Avatar name={g.name} size={30} />}
                <div className="font-bold t1">{g.name}</div>
                <Pill tone={g.tasks.length ? 'ok' : 'off'}>{g.tasks.length} open</Pill>
              </div>
              {g.tasks.length
                ? g.tasks.map((t) => (
                  <TaskRow key={t.id} t={t} onEdit={setEditing} onMove={move} onDelete={remove} canDelete={canDelete} />
                ))
                : <div className="text-sm t3 py-2">Nothing assigned.</div>}
            </Card>
          ))}
        </div>
      )}

      {!err && !!visible.length && view === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {STATUS_ORDER.filter((s) => showDone || s !== 'done').map((s) => {
            const rows = visible.filter((t) => t.status === s);
            return (
              <Card key={s} className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Pill tone={STATUS_META[s].tone}>{STATUS_META[s].label}</Pill>
                  <span className="text-xs t3">{rows.length}</span>
                </div>
                {rows.length
                  ? rows.map((t) => (
                    <TaskRow key={t.id} t={t} onEdit={setEditing} onMove={move} onDelete={remove}
                      canDelete={canDelete} showAssignee />
                  ))
                  : <div className="text-sm t3 py-2">Nothing here.</div>}
              </Card>
            );
          })}
        </div>
      )}

      {editing !== undefined && dept && (
        <TaskModal
          task={editing}
          department={dept}
          members={members}
          onClose={() => setEditing(undefined)}
          onSaved={load}
        />
      )}
    </div>
  );
}

export default Boards;

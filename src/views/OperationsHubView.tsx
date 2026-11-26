import React, { useState } from 'react';
import { useDmc } from '../context/DmcContext';
import { DestinationRegion, OperationsTask } from '../types';
import { Plus, X } from 'lucide-react';

export const OperationsHubView: React.FC = () => {
  const {
    operationsTasks,
    updateOperationsTask,
    addOperationsTask,
    confirmedTours,
    supplierBookings,
    updateSupplierBooking,
    setSelectedTourCode
  } = useDmc();

  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  const [taskTourCode, setTaskTourCode] = useState(confirmedTours[0]?.tourCode || 'LST-2026-00001');
  const [taskCategory, setTaskCategory] = useState<OperationsTask['category']>('hotel');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('Bhaskar Jyoti Phukan');
  const [taskDueDate, setTaskDueDate] = useState('2026-11-12');

  const destinations: DestinationRegion[] = [
    'Meghalaya', 'Assam', 'Arunachal Pradesh', 'Bhutan', 'Nepal', 'Thailand'
  ];

  const filteredTasks = operationsTasks.filter(t => {
    const matchesDest = selectedDestination === 'all' || t.destination === selectedDestination;
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    return matchesDest && matchesStatus;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const tour = confirmedTours.find(t => t.tourCode === taskTourCode);
    addOperationsTask({
      tourCode: taskTourCode,
      destination: tour?.destination || 'Meghalaya',
      category: taskCategory,
      title: taskTitle,
      assignedTo: taskAssignee,
      dueDate: taskDueDate,
      status: 'pending'
    });
    setTaskTitle('');
    setShowAddTaskModal(false);
  };

  return (
    <div className="space-y-8">
      {/* Clean Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">
            Ground Execution & Reservations · Let's See Tour & Travels
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Destination Operations Hub
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Destination-wise action items, hotel confirmations, guide allocations, and voucher dispatch.
          </p>
        </div>

        <button
          onClick={() => setShowAddTaskModal(true)}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Ground Task</span>
        </button>
      </div>

      {/* Pure Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Operational Tasks Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <h2 className="text-base font-bold text-slate-900">Operational Action Items</h2>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-emerald-600"
              >
                <option value="all">All Destinations</option>
                {destinations.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-emerald-600"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No operational tasks match the selected filters.
              </div>
            ) : (
              filteredTasks.map(task => (
                <div key={task.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedTourCode(task.tourCode)}
                        className="font-mono font-bold text-emerald-700 hover:underline"
                      >
                        {task.tourCode}
                      </button>
                      <span className="text-slate-300">·</span>
                      <span className="font-semibold text-slate-900 text-sm">{task.title}</span>
                    </div>
                    <p className="text-slate-500 tabular-nums">
                      {task.destination} · Assigned to <span className="text-slate-800 font-medium">{task.assignedTo}</span> · Due {task.dueDate}
                    </p>
                    {task.notes && (
                      <p className="text-slate-600 pt-1">{task.notes}</p>
                    )}
                  </div>

                  <select
                    value={task.status}
                    onChange={(e) => updateOperationsTask(task.id, e.target.value as any)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold capitalize border bg-white outline-none shrink-0 ${
                      task.status === 'completed'
                        ? 'text-emerald-700 border-emerald-200'
                        : task.status === 'in_progress'
                        ? 'text-emerald-800 border-emerald-300'
                        : task.status === 'blocked'
                        ? 'text-rose-700 border-rose-200'
                        : 'text-amber-700 border-amber-200'
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Supplier Reservations Pure Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Supplier Confirmations</h2>
          </div>

          <div className="divide-y divide-slate-100">
            {supplierBookings.map(sb => (
              <div key={sb.id} className="px-6 py-4 space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{sb.supplierName}</span>
                  <span className={`font-semibold capitalize shrink-0 ${
                    sb.status === 'booked_confirmed' || sb.status === 'partially_paid' || sb.status === 'fully_paid'
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}>
                    {sb.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="text-slate-600">{sb.details}</p>

                <div className="flex items-center justify-between text-slate-500 tabular-nums pt-1">
                  <span className="font-mono">{sb.tourCode}</span>
                  <span className="font-bold text-slate-900">₹{sb.agreedAmount.toLocaleString('en-IN')}</span>
                </div>

                {sb.status !== 'booked_confirmed' && sb.status !== 'partially_paid' && sb.status !== 'fully_paid' && (
                  <button
                    onClick={() => updateSupplierBooking(sb.id, { status: 'booked_confirmed' })}
                    className="w-full mt-2 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Confirm Booking & Issue Ref
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Create Ground Task</h3>
              <button onClick={() => setShowAddTaskModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Target Tour Code *</label>
                <select
                  value={taskTourCode}
                  onChange={(e) => setTaskTourCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono font-semibold"
                >
                  {confirmedTours.map(t => (
                    <option key={t.tourCode} value={t.tourCode}>{t.tourCode} - {t.packageName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Task Category *</label>
                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium"
                >
                  <option value="hotel">Hotel Reservation & Room Check</option>
                  <option value="transport">Vehicle & Driver Allocation</option>
                  <option value="permit">Government & Safari Permits</option>
                  <option value="guide">Guide & Escort Coordination</option>
                  <option value="voucher">Voucher Generation</option>
                  <option value="briefing">Pre-departure Guest Briefing</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">Task Description *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Confirm VIP darshan passes at Kamakhya Temple"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Assigned Executive</label>
                  <input
                    type="text"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg tabular-nums"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

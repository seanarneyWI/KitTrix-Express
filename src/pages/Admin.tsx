import React, { useState, useEffect } from 'react';

interface KittingJob {
  id: string;
  customerName: string;
  jobNumber: string;
  dueDate: string;
  orderedQuantity: number;
  description: string;
  expectedJobDuration: number;
  expectedKitDuration: number;
  status: string;
  jobProgress?: {
    id: string;
    completedKits: number;
    currentKitNumber: number;
    kitExecutions?: Array<{
      id: string;
      kitNumber: number;
      actualDuration: number;
      completed: boolean;
    }>;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'WORKER';
  isActive: boolean;
  workCenter?: {
    id: string;
    name: string;
  };
}

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manage' | 'users'>('manage');
  const [existingJobs, setExistingJobs] = useState<KittingJob[]>([]);
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('IN_PROGRESS');
  const [filteredJobs, setFilteredJobs] = useState<KittingJob[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const calculatePerformanceStatus = (job: KittingJob): 'AHEAD' | 'ON_TIME' | 'BEHIND' | null => {
    if (!job.jobProgress || !job.jobProgress.kitExecutions || job.jobProgress.kitExecutions.length === 0) {
      return null;
    }

    // Get the most recent completed kit
    const completedKits = job.jobProgress.kitExecutions.filter(k => k.completed && k.actualDuration);
    if (completedKits.length === 0) return null;

    const lastKit = completedKits[completedKits.length - 1];
    const expectedDuration = job.expectedKitDuration;
    const actualDuration = lastKit.actualDuration;

    if (expectedDuration === 0) return null;

    const variancePercentage = Math.round(((actualDuration - expectedDuration) / expectedDuration) * 100);

    if (variancePercentage > 10) return 'BEHIND';
    if (variancePercentage < -10) return 'AHEAD';
    return 'ON_TIME';
  };

  useEffect(() => {
    fetchExistingJobs();
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleJobUpdate = () => {
      fetchExistingJobs();
    };

    window.addEventListener('jobsUpdated', handleJobUpdate);
    return () => window.removeEventListener('jobsUpdated', handleJobUpdate);
  }, []);

  // Real-time updates for active jobs
  useEffect(() => {
    const interval = setInterval(() => {
      // Only fetch if we have active jobs (IN_PROGRESS or PAUSED)
      const hasActiveJobs = existingJobs.some(job =>
        job.status === 'IN_PROGRESS' || job.status === 'PAUSED'
      );

      if (hasActiveJobs) {
        fetchExistingJobs();
      }
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [existingJobs]);

  useEffect(() => {
    if (jobStatusFilter === 'ALL') {
      setFilteredJobs(existingJobs);
    } else {
      setFilteredJobs(existingJobs.filter(job => job.status === jobStatusFilter));
    }
  }, [existingJobs, jobStatusFilter]);


  const fetchExistingJobs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/kitting-jobs');
      if (response.ok) {
        const data = await response.json();
        setExistingJobs(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };


  const fetchUsers = async () => {
    try {
      // Mock users for now since users API may not exist in Express version
      const mockUsers: User[] = [
        {
          id: '1',
          name: 'Test Admin',
          email: 'admin@example.com',
          role: 'ADMIN',
          isActive: true
        },
        {
          id: '2',
          name: 'Test Worker',
          email: 'worker@example.com',
          role: 'WORKER',
          isActive: true,
          workCenter: {
            id: '1',
            name: 'Assembly Line 1'
          }
        }
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/kitting-jobs/${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Dispatch event to notify other components that jobs have been updated
        window.dispatchEvent(new CustomEvent('jobsUpdated'));
        setSuccessMessage('Job deleted successfully');
        fetchExistingJobs();
      } else {
        const errorData = await response.json();
        setErrors([errorData.error || 'Failed to delete job']);
      }
    } catch (error) {
      setErrors(['Failed to delete job']);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'manage'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Manage Jobs
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'users'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Manage Users
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Error Messages */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="text-red-800 font-semibold mb-2">Error:</h3>
                <ul className="text-red-700 text-sm space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800">{successMessage}</p>
              </div>
            )}

            {activeTab === 'manage' ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-800">Manage Jobs</h1>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => window.open('/edit-job/new', '_blank')}
                      className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg font-semibold transition-colors border border-green-200 flex items-center gap-2"
                    >
                      <span className="text-lg font-bold">+</span>
                      Create Job
                    </button>

                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Filter:</label>
                      <select
                        value={jobStatusFilter}
                        onChange={(e) => setJobStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ALL">All Jobs ({existingJobs.length})</option>
                        <option value="SCHEDULED">Scheduled ({existingJobs.filter(j => j.status === 'SCHEDULED').length})</option>
                        <option value="IN_PROGRESS">In Progress ({existingJobs.filter(j => j.status === 'IN_PROGRESS').length})</option>
                        <option value="PAUSED">Paused ({existingJobs.filter(j => j.status === 'PAUSED').length})</option>
                        <option value="COMPLETED">Completed ({existingJobs.filter(j => j.status === 'COMPLETED').length})</option>
                        <option value="CANCELLED">Cancelled ({existingJobs.filter(j => j.status === 'CANCELLED').length})</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {filteredJobs.map((job) => (
                    <div key={job.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all hover:border-gray-300">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">
                            {job.jobNumber} - {job.description}
                          </h3>
                          <p className="text-gray-600">{job.customerName}</p>
                          <p className="text-sm text-gray-500">
                            Due: {new Date(job.dueDate).toLocaleString()}
                          </p>
                          <div className="flex gap-4 mt-2 text-sm flex-wrap">
                            <span>Quantity: {job.orderedQuantity}</span>
                            <span>Status: <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                              job.status === 'IN_PROGRESS' ? 'bg-green-100 text-green-800' :
                              job.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                              job.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                              job.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>{job.status.replace(/_/g, ' ')}</span></span>
                            <span>Duration: {formatDuration(job.expectedJobDuration)}</span>
                            {(() => {
                              const performance = calculatePerformanceStatus(job);
                              return performance ? (
                                <span>Performance: <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                                  performance === 'AHEAD' ? 'bg-green-100 text-green-800' :
                                  performance === 'BEHIND' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>{performance.replace('_', ' ')}</span></span>
                              ) : null;
                            })()}
                          </div>

                          {/* Progress Bar for IN_PROGRESS and PAUSED jobs */}
                          {(job.status === 'IN_PROGRESS' || job.status === 'PAUSED') && job.jobProgress && (
                            <div className="mt-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">Kit Progress</span>
                                <span className="text-sm text-gray-600">
                                  {job.jobProgress.completedKits} / {job.orderedQuantity} kits
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className={`h-3 rounded-full transition-all duration-300 ${
                                    job.status === 'IN_PROGRESS' ? 'bg-green-500' : 'bg-yellow-500'
                                  }`}
                                  style={{
                                    width: `${Math.min(100, (job.jobProgress.completedKits / job.orderedQuantity) * 100)}%`
                                  }}
                                ></div>
                              </div>
                              <div className="flex justify-between mt-1 text-xs text-gray-500">
                                <span>{Math.round((job.jobProgress.completedKits / job.orderedQuantity) * 100)}% complete</span>
                                {job.jobProgress.currentKitNumber && (
                                  <span className="font-medium text-blue-600">
                                    Currently on kit #{job.jobProgress.currentKitNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {(job.status === 'IN_PROGRESS' || job.status === 'PAUSED') && (
                            <button
                              onClick={() => window.open(`/execute/${job.id}`, '_blank')}
                              className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-sm transition-colors border border-green-200"
                            >
                              Monitor
                            </button>
                          )}
                          {(job.status === 'SCHEDULED' || job.status === 'PAUSED') && (
                            <button
                              onClick={() => window.open(`/execute/${job.id}`, '_blank')}
                              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-sm transition-colors border border-blue-200"
                            >
                              Start Job
                            </button>
                          )}
                          <button
                            onClick={() => window.open(`/edit-job/${job.id}`, '_blank')}
                            className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded text-sm transition-colors border border-purple-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm transition-colors border border-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredJobs.length === 0 && existingJobs.length > 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No jobs found with status "{jobStatusFilter}". Try a different filter.
                    </div>
                  )}

                  {existingJobs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No jobs created yet. Use the "Create Job" button to add your first job.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
                </div>

                <div className="space-y-6">
                  {users.map((user) => (
                    <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all hover:border-gray-300">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{user.name}</h3>
                          <p className="text-gray-600">{user.email}</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="flex items-center gap-2">
                              Role:
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                                user.role === 'SUPERVISOR' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {user.role}
                              </span>
                            </span>
                            {user.workCenter && (
                              <span>Work Center: <span className="font-medium">{user.workCenter.name}</span></span>
                            )}
                            <span>Status: <span className={`font-medium ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {users.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No users found.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
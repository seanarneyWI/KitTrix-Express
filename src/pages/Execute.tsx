import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KittingJob } from '../types/kitting';
import { apiUrl } from '../config/api';

interface JobAssignment {
  id: string;
  jobId: string;
  job?: KittingJob;
  assignedAt: string;
  workCenterId?: string;
  priority: number;
}

const Execute: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch assigned jobs from the server
  useEffect(() => {
    fetchAssignedJobs();
  }, []);

  const fetchAssignedJobs = async () => {
    try {
      // For now, fetch all jobs with 'in-progress' and 'scheduled' status
      // In the real implementation, this would filter by user assignment
      const response = await fetch(apiUrl('/api/kitting-jobs'));
      if (response.ok) {
        const jobs = await response.json();

        // Convert jobs to mock assignments - in real implementation this would come from assignments API
        const mockAssignments: JobAssignment[] = jobs
          .filter((job: KittingJob) => job.status === 'in-progress' || job.status === 'scheduled')
          .map((job: KittingJob) => ({
            id: `assignment-${job.id}`,
            jobId: job.id,
            job: job,
            assignedAt: new Date().toISOString(),
            priority: job.status === 'in-progress' ? 1 : 2
          }));

        setAssignments(mockAssignments);

        // If worker has only one assigned job, redirect directly to it
        if (mockAssignments.length === 1) {
          navigate(`/execute/${mockAssignments[0].jobId}`);
          return;
        }
      } else {
        setError('Failed to fetch assignments');
      }
    } catch (error) {
      console.error('Error fetching assigned jobs:', error);
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No assigned jobs
  if (assignments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center max-w-md">
          <div className="text-6xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">No Jobs Assigned</h1>
          <p className="text-gray-600 mb-6">
            You don't have any active job assignments. Please contact your supervisor.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Multiple assigned jobs - let worker choose
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Assigned Jobs</h1>
          <p className="text-gray-600">Select a job to start working</p>
        </div>

        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/execute/${assignment.jobId}`)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {assignment.job?.jobNumber} - {assignment.job?.description}
                  </h3>
                  <p className="text-gray-600 mb-2">{assignment.job?.customerName}</p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assignment.job?.status === 'in-progress' ? 'bg-green-100 text-green-800' :
                      assignment.job?.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {assignment.job?.status.toUpperCase()}
                    </span>
                    <span>Quantity: {assignment.job?.orderedQuantity}</span>
                  </div>
                </div>

                <div className="text-right">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                    {assignment.job?.status === 'in-progress' ? 'Continue Job' : 'Start Job'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => window.location.reload()}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Refresh assignments
          </button>
        </div>
      </div>
    </div>
  );
};

export default Execute;
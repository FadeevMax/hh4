import { useState, useEffect, useCallback } from 'react';

interface Application {
  id: string;
  vacancyId: string;
  vacancyName: string;
  employerName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  hasUpdates: boolean;
  url: string;
}

interface ApplicationHistoryProps {
  userId: string;
  onStatusChange?: (status: 'idle' | 'loading' | 'success' | 'error', message?: string) => void;
}

export default function ApplicationHistory({ userId, onStatusChange }: ApplicationHistoryProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [totalApplications, setTotalApplications] = useState<number>(0);

  // Define fetchApplications as a useCallback to avoid recreating it on every render
  const fetchApplications = useCallback(async () => {
    if (!userId) return;

    // If already tried and failed, don't keep retrying automatically
    if (isLoading) return;

    // Check if we have a valid token before making requests
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      console.warn('No access token found, showing login button');
      setApplications([]);
      return;
    }

    try {
      setIsLoading(true);
      if (onStatusChange) {
        onStatusChange('loading', 'Загрузка истории откликов...');
      }

      // Try to refresh the token first
      try {
        const refreshResponse = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        });
        
        if (!refreshResponse.ok) {
          const errorData = await refreshResponse.json();
          if (errorData.requireReauth) {
            // Don't throw, just return and show login button
            setIsLoading(false);
            setApplications([]);
            return;
          }
        }
      } catch (refreshError) {
        console.warn('Token refresh failed:', refreshError);
        // Just return and show login button instead of continuing
        setIsLoading(false);
        setApplications([]);
        return;
      }

      const response = await fetch(`/api/user/applications?userId=${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Special handling for 401 errors - just show login button
        if (response.status === 401) {
          console.log('Authentication failed, showing login button');
          setApplications([]);
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorData.error || 'Failed to fetch applications');
      }
      
      const data = await response.json();
      setApplications(data.applications);
      setTotalApplications(data.total);
      
      if (onStatusChange) {
        onStatusChange('success', `Загружено ${data.applications.length} откликов`);
        
        // Reset the status message after 3 seconds
        setTimeout(() => {
          if (onStatusChange) onStatusChange('idle');
        }, 3000);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      if (onStatusChange) {
        onStatusChange('error', error instanceof Error ? error.message : 'Не удалось загрузить историю откликов');
        
        // Reset status after error too
        setTimeout(() => {
          if (onStatusChange) onStatusChange('idle');
        }, 5000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Using useEffect with a proper cleanup function
  useEffect(() => {
    let isMounted = true;

    // Only fetch once on initial mount if we have a userId AND an access token
    if (userId && localStorage.getItem('accessToken') && isMounted) {
      fetchApplications();
    }
    
    return () => {
      isMounted = false;
    };
  }, [userId, fetchApplications]);

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge style based on the status
  const getStatusBadgeClass = (status: string) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('отказ') || statusLower.includes('отклонен')) {
      return 'bg-red-100 text-red-800';
    } else if (statusLower.includes('приглаш') || statusLower.includes('интерв')) {
      return 'bg-green-100 text-green-800';
    } else if (statusLower.includes('рассм')) {
      return 'bg-blue-100 text-blue-800';
    } else if (statusLower.includes('нов')) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">История откликов</h2>
        
        <button
          onClick={() => fetchApplications()}
          disabled={isLoading}
          className="text-sm px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 transition disabled:opacity-50"
        >
          {isLoading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>
      
      {isLoading && applications.length === 0 ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Загрузка истории откликов...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 text-lg">У вас пока нет откликов на вакансии, или необходимо заново авторизоваться.</p>
          <p className="mt-2 text-gray-500">
            Используйте функцию автоматического отклика или откликайтесь вручную на интересующие вас вакансии.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Войти снова
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Вакансия
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Компания
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата отклика
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id} className={app.hasUpdates ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {app.vacancyName}
                      {app.hasUpdates && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Новое
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.employerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(app.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a 
                        href={app.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-red-600 hover:text-red-900"
                      >
                        Открыть
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            Всего откликов: {totalApplications}
          </div>
        </>
      )}
    </div>
  );
} 
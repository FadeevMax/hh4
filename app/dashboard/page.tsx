'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import JobFilterConfig from '@/components/JobFilterConfig';
import type { HHVacancy } from '@/types';

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('welcome'); 
  const [vacancies, setVacancies] = useState<HHVacancy[]>([]);
  const [searchStatus, setSearchStatus] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });
  const [filterActive, setFilterActive] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [searchResumeId, setSearchResumeId] = useState<string>('');
  const [resumes, setResumes] = useState<any[]>([]);
  
  // Only load user data from localStorage, not from API
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        console.error("Failed to parse user data");
      }
    } else {
      // Redirect to login if no user data
      router.push('/login');
    }
    
    // Check if filter is saved
    const savedFilter = localStorage.getItem('jobFilter');
    if (savedFilter) {
      setFilterActive(true);
    }
  }, [router]);

  // Fetch the user's resumes on component mount
  useEffect(() => {
    const fetchResumes = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return;

      try {
        const res = await fetch('/api/user/resumes', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setResumes(data.items);
          if (data.items.length > 0) {
            setSelectedResumeId(data.items[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to fetch resumes:', e);
      }
    };

    fetchResumes();
  }, []);

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('jobFilter');
    localStorage.removeItem('tokenExpiration');
    
    // Redirect to login page
    router.push('/login');
  };
  
  const handleSearchResults = (results: HHVacancy[], resumeId?: string) => {
    setVacancies(results);
    if (resumeId) {
      setSearchResumeId(resumeId);
      setSelectedResumeId(resumeId);
    }
    if (results.length > 0) {
      setActiveTab('results');
    }
  };
  
  const handleStatusChange = (status: 'idle' | 'loading' | 'success' | 'error', message?: string) => {
    setSearchStatus({ status, message });
  };
  
  const handleFilterSave = () => {
    setFilterActive(true);
  };
  
  const handleFilterReset = () => {
    setFilterActive(false);
  };

  const loadApplicationHistory = () => {
    import('@/components/ApplicationHistory').then((module) => {
      const ApplicationHistory = module.default;
      setActiveTab('history');
      setComponentToRender(
        <ApplicationHistory 
          userId={user?.id ?? ''}
          onStatusChange={handleStatusChange}
        />
      );
    });
  };

  const formatSalary = (salary: HHVacancy['salary']) => {
    if (!salary) return 'Не указана';
    
    const { from, to, currency } = salary;
    
    if (from && to) {
      return `${from} - ${to} ${currency}`;
    } else if (from) {
      return `от ${from} ${currency}`;
    } else if (to) {
      return `до ${to} ${currency}`;
    }
    
    return 'Не указана';
  };
  
  // Store dynamically loaded component
  const [componentToRender, setComponentToRender] = useState<React.ReactNode>(null);

  // New function to handle apply to all vacancies
  const handleApplyToAll = async () => {
    if (vacancies.length === 0) {
      setSearchStatus({ 
        status: 'error', 
        message: 'Нет вакансий для отклика. Сначала выполните поиск.' 
      });
      return;
    }
    
    // Use either the selected resume or the one used for search
    const resumeIdToUse = selectedResumeId || searchResumeId;
    
    if (!resumeIdToUse) {
      setSearchStatus({
        status: 'error',
        message: 'Выберите резюме для отклика'
      });
      return;
    }
    
    try {
      setIsApplying(true);
      setSearchStatus({
        status: 'loading',
        message: 'Отправка откликов...'
      });
      
      let successCount = 0;
      let failCount = 0;
      
      // Get access token
      const accessToken = localStorage.getItem('accessToken');
      const coverLetter = localStorage.getItem('jobFilter') 
        ? JSON.parse(localStorage.getItem('jobFilter') || '{}').coverLetter || undefined
        : undefined;
      
      if (!accessToken) {
        throw new Error('Необходима авторизация. Пожалуйста, войдите снова.');
      }
      
      // Apply to each vacancy
      for (const vacancy of vacancies) {
        try {
          // Create FormData for multipart/form-data request
          const formData = new FormData();
          formData.append('resume_id', resumeIdToUse);
          formData.append('vacancy_id', vacancy.id);
          
          // Add cover letter if available
          if (coverLetter && coverLetter.trim()) {
            formData.append('message', coverLetter.trim());
          }
          
          // Make the API request
          const applyResponse = await fetch('/api/negotiations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              // Don't set Content-Type for FormData, browser will set it with boundary
            },
            body: formData
          });
          
          if (applyResponse.ok || applyResponse.status === 201 || applyResponse.status === 303) {
            successCount++;
            setSearchStatus({
              status: 'loading',
              message: `Отклики отправлены: ${successCount} из ${vacancies.length}`
            });
          } else {
            // Try to get error information
            let errorData;
            try {
              errorData = await applyResponse.json();
            } catch {
              errorData = { description: `Ошибка ${applyResponse.status}` };
            }
            
            failCount++;
            console.error('Apply error:', errorData);
          }
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1200));
          
        } catch (applyError) {
          failCount++;
          console.error('Apply error:', applyError);
        }
      }
      
      // Final status update
      if (failCount === 0) {
        setSearchStatus({
          status: 'success',
          message: `Успешно отправлено ${successCount} откликов`
        });
      } else {
        setSearchStatus({
          status: 'success',
          message: `Отправлено ${successCount} откликов. ${failCount} откликов не удалось отправить.`
        });
      }

      // Load application history after applying
      setTimeout(loadApplicationHistory, 2000);

    } catch (error) {
      console.error('Apply error:', error);
      setSearchStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Ошибка при отправке откликов'
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-black">
              <span className="text-red-600">hh</span><span className="text-black">Auto</span> - Панель управления
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition font-bold"
            >
              Выйти
            </button>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            {/* User Profile Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Информация о пользователе</h2>
              
              {user && (
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-black">ID на HeadHunter:</span> <span className="text-black">{user.id}</span>
                  </div>
                  <div>
                    <span className="font-medium text-black">Имя:</span> <span className="text-black">{String(user.firstName || '')}</span>
                  </div>
                  <div>
                    <span className="font-medium text-black">Фамилия:</span> <span className="text-black">{String(user.lastName || '')}</span>
                  </div>
                  {user.email && (
                    <div>
                      <span className="font-medium text-black">Email:</span> <span className="text-black">{user.email}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-black">Статус подключения к HH.ru:</span>{' '}
                    <span className="text-green-600 font-bold">Подключено</span>
                  </div>
                </div>
              )}

              {!user && (
                <div className="text-center py-4">
                  <p className="text-black">Нет данных пользователя. Пожалуйста, авторизуйтесь.</p>
                  <button
                    onClick={() => router.push('/login')}
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition font-bold"
                  >
                    Войти через HeadHunter
                  </button>
                </div>
              )}
            </div>
            
            {/* Search Status Message */}
            {searchStatus.status !== 'idle' && (
              <div className={`mt-6 p-4 rounded-md ${
                searchStatus.status === 'loading' ? 'bg-blue-50 text-blue-700' :
                searchStatus.status === 'success' ? 'bg-green-50 text-green-700' :
                'bg-red-50 text-red-700'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {searchStatus.status === 'loading' && (
                      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    )}
                    {searchStatus.status === 'success' && (
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {searchStatus.status === 'error' && (
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-black">{searchStatus.message}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Action Cards Instead of Tabs */}
            {activeTab === 'welcome' && user && (
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Search Vacancies Card */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                        <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dt className="text-lg font-medium text-gray-900">Поиск вакансий</dt>
                        <dd className="mt-2 text-base text-gray-500">
                          Поиск вакансий на HeadHunter с помощью фильтров
                        </dd>
                        <dd className="mt-2 text-base text-gray-500">
                          Настройте фильтры поиска вакансий с учетом ваших требований для автоматического отклика.
                        </dd>
                      </div>
                    </div>
                    <div className="mt-5">
                      <button
                        onClick={() => {
                          setActiveTab('filter');
                          setComponentToRender(
                            <JobFilterConfig 
                              onSearchResults={handleSearchResults}
                              onStatusChange={handleStatusChange}
                              onFilterSave={handleFilterSave}
                              onFilterReset={handleFilterReset}
                            />
                          );
                        }}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Настроить поиск
                      </button>
                    </div>
                  </div>
                </div>

                {/* History Card */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                        <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dt className="text-lg font-medium text-gray-900">История откликов</dt>
                        <dd className="mt-2 text-base text-gray-500">
                          Просмотр истории ваших откликов на вакансии, отслеживание статусов и обновлений.
                        </dd>
                      </div>
                    </div>
                    <div className="mt-5">
                      <button
                        onClick={loadApplicationHistory}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Просмотреть историю
                      </button>
                    </div>
                  </div>
                </div>

                {/* Results Card */}
                {vacancies.length > 0 && (
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                          <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dt className="text-lg font-medium text-gray-900">Результаты поиска</dt>
                          <dd className="mt-2 text-base text-gray-500">
                            Найдено {vacancies.length} вакансий по вашим фильтрам.
                          </dd>
                        </div>
                      </div>
                      <div className="mt-5">
                        <button
                          onClick={() => setActiveTab('results')}
                          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Просмотреть результаты
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Results view */}
            {activeTab === 'results' && (
              <div className="bg-white shadow rounded-lg p-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Результаты поиска</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleApplyToAll}
                      disabled={isApplying || vacancies.length === 0 || (!selectedResumeId && !searchResumeId)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 text-sm font-medium"
                    >
                      {isApplying ? 'Отправка откликов...' : 'Откликнуться на все'}
                    </button>
                    <button
                      onClick={() => setActiveTab('welcome')}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm text-black font-medium"
                    >
                      Вернуться
                    </button>
                  </div>
                </div>
                
                {/* Resume selection for Apply to All */}
                <div className="mb-4">
                  <label htmlFor="dashboard-resume" className="block text-sm font-medium text-black mb-1">
                    Выберите резюме для отклика
                  </label>
                  <div className="flex items-center">
                    <select
                      id="dashboard-resume"
                      value={selectedResumeId}
                      onChange={e => setSelectedResumeId(e.target.value)}
                      className="block w-full md:w-1/2 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    >
                      {resumes.length === 0 && <option value="">Нет резюме</option>}
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>{r.title || r.profession || r.id}</option>
                      ))}
                    </select>
                    {searchResumeId && searchResumeId !== selectedResumeId && (
                      <button 
                        onClick={() => setSelectedResumeId(searchResumeId)}
                        className="ml-2 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                      >
                        Использовать резюме из поиска
                      </button>
                    )}
                  </div>
                  {searchResumeId && (
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedResumeId === searchResumeId 
                        ? "Будет использовано то же резюме, что и при поиске" 
                        : "Вы можете использовать другое резюме или вернуться к тому, что использовалось при поиске"}
                    </p>
                  )}
                </div>
                
                {vacancies.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-500 text-lg">Нет результатов поиска. Используйте фильтр для поиска вакансий.</p>
                  </div>
                ) : (
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
                            Зарплата
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Город
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Действия
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {vacancies.map((vacancy) => (
                          <tr key={vacancy.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {vacancy.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {vacancy.employer.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatSalary(vacancy.salary)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {vacancy.area.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <a href={vacancy.alternate_url} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-900 mr-4">
                                Просмотреть
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            
            {/* Filter Config */}
            {activeTab === 'filter' && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-black">Настройка поиска</h2>
                  <button
                    onClick={() => setActiveTab('welcome')}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm text-black font-medium"
                  >
                    Вернуться
                  </button>
                </div>
                {componentToRender}
              </div>
            )}
            
            {/* Dynamically loaded content for auto-apply and history */}
            {(activeTab === 'history') && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-black">
                    История откликов
                  </h2>
                  <button
                    onClick={() => setActiveTab('welcome')}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm text-black font-medium"
                  >
                    Вернуться
                  </button>
                </div>
                {componentToRender}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 
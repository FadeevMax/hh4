import { useState, useEffect } from 'react';

interface ResumeOption {
  id: string;
  title: string;
  status?: string;
  updatedAt?: string;
  url?: string;
}

interface AutoApplicatorProps {
  userId: string;
  filterActive: boolean;
  onStatusChange?: (status: 'idle' | 'loading' | 'success' | 'error', message?: string) => void;
  onApplicationComplete?: (results: any) => void;
}

export default function AutoApplicator({ 
  userId, 
  filterActive, 
  onStatusChange, 
  onApplicationComplete 
}: AutoApplicatorProps) {
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isLoadingResumes, setIsLoadingResumes] = useState<boolean>(false);
  const [progress, setProgress] = useState<{current: number, total: number}>({ current: 0, total: 0 });
  const [results, setResults] = useState<{applied: number, failed: number, total: number}>({ 
    applied: 0, 
    failed: 0, 
    total: 0 
  });

  // Load user's resumes on component mount
  useEffect(() => {
    const fetchResumes = async () => {
      if (!userId) return;
      
      // Prevent multiple simultaneous requests
      if (isLoadingResumes) return;

      // Check if we have a valid token before making requests
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        console.warn('No access token found, skipping resume fetch');
        return;
      }

      try {
        setIsLoadingResumes(true);
        if (onStatusChange) {
          onStatusChange('loading', 'Загрузка резюме из HH.ru...');
        }

        // Attempt to refresh the token first
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
              // Don't throw, just return and show message
              setIsLoadingResumes(false);
              if (onStatusChange) {
                onStatusChange('error', 'Необходима повторная авторизация на HH.ru');
              }
              return;
            }
          }
        } catch (refreshError) {
          console.warn('Token refresh failed:', refreshError);
          // Just return instead of continuing
          setIsLoadingResumes(false);
          return;
        }

        // After token refresh, fetch resumes
        const response = await fetch(`/api/user/resumes?userId=${userId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          
          // Special handling for 401 errors - just show message
          if (response.status === 401) {
            console.log('Authentication failed when fetching resumes');
            setIsLoadingResumes(false);
            if (onStatusChange) {
              onStatusChange('error', 'Требуется авторизация на HH.ru');
            }
            return;
          }
          
          throw new Error(errorData.error || 'Не удалось загрузить резюме');
        }
        
        const data = await response.json();
        
        if (data.items && Array.isArray(data.items)) {
          setResumes(data.items);
          if (data.items.length > 0 && !selectedResumeId) {
            setSelectedResumeId(data.items[0].id);
          }
          
          if (onStatusChange) {
            onStatusChange('success', `Загружено ${data.items.length} резюме`);
            
            // Reset the status message after 3 seconds
            setTimeout(() => {
              if (onStatusChange) onStatusChange('idle');
            }, 3000);
          }
        } else {
          throw new Error('Неверный формат данных резюме');
        }
      } catch (error) {
        console.error('Error fetching resumes:', error);
        if (onStatusChange) {
          onStatusChange('error', error instanceof Error ? error.message : 'Не удалось загрузить резюме');
        }
      } finally {
        setIsLoadingResumes(false);
      }
    };

    // Only attempt to fetch if we have a userId AND an access token
    if (userId && localStorage.getItem('accessToken')) {
      fetchResumes();
    }
  }, [userId, selectedResumeId, onStatusChange]);

  // Function to start the auto-application process
  const startAutoApplication = async () => {
    if (!selectedResumeId) {
      if (onStatusChange) {
        onStatusChange('error', 'Выберите резюме для отклика');
      }
      return;
    }

    try {
      setIsApplying(true);
      
      // Get filter from localStorage
      const savedFilter = localStorage.getItem('jobFilter');
      if (!savedFilter) {
        throw new Error('Фильтр поиска не найден');
      }
      
      const filter = JSON.parse(savedFilter);
      
      if (onStatusChange) {
        onStatusChange('loading', 'Поиск подходящих вакансий...');
      }
      
      // 1. Search for matching vacancies
      const searchResponse = await fetch('/api/vacancies/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          filter
        })
      });
      
      if (!searchResponse.ok) {
        const error = await searchResponse.json();
        throw new Error(error.error || 'Ошибка при поиске вакансий');
      }
      
      const searchData = await searchResponse.json();
      const vacancies = searchData.items;
      
      if (!vacancies || vacancies.length === 0) {
        if (onStatusChange) {
          onStatusChange('success', 'Не найдено подходящих вакансий для автоотклика');
        }
        setIsApplying(false);
        return;
      }
      
      // 2. Start applying to vacancies
      if (onStatusChange) {
        onStatusChange('loading', `Начинаем отклик на ${vacancies.length} вакансий...`);
      }
      
      setProgress({ current: 0, total: vacancies.length });
      setResults({ applied: 0, failed: 0, total: vacancies.length });
      
      // 3. Apply to each vacancy sequentially to avoid rate limiting
      let applied = 0;
      let failed = 0;
      
      for (let i = 0; i < vacancies.length; i++) {
        const vacancy = vacancies[i];
        setProgress({ current: i + 1, total: vacancies.length });
        
        try {
          if (onStatusChange) {
            onStatusChange('loading', `Отклик на вакансию ${i + 1} из ${vacancies.length}: ${vacancy.name}`);
          }
          
          // Apply to the vacancy
          const applyResponse = await fetch('/api/vacancies/apply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId,
              vacancyId: vacancy.id,
              resumeId: selectedResumeId,
              coverLetter
            })
          });
          
          if (applyResponse.ok) {
            applied++;
            setResults(prev => ({ ...prev, applied }));
          } else {
            failed++;
            setResults(prev => ({ ...prev, failed }));
            console.error(`Failed to apply to vacancy ${vacancy.id}:`, await applyResponse.text());
          }
          
          // Add a delay between requests to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          failed++;
          setResults(prev => ({ ...prev, failed }));
          console.error(`Error applying to vacancy ${vacancy.id}:`, error);
        }
      }
      
      // 4. Report final results
      if (onStatusChange) {
        onStatusChange(
          'success', 
          `Автоотклик завершен. Успешно: ${applied}, Неудачно: ${failed}, Всего: ${vacancies.length}`
        );
      }
      
      if (onApplicationComplete) {
        onApplicationComplete({
          applied,
          failed,
          total: vacancies.length
        });
      }
      
    } catch (error) {
      console.error('Auto application error:', error);
      if (onStatusChange) {
        onStatusChange('error', error instanceof Error ? error.message : 'Ошибка при автоматическом отклике');
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4">Автоматический отклик на вакансии</h2>
      
      <div className="space-y-6">
        {/* Resume Selection */}
        <div>
          <label htmlFor="resumeSelect" className="block text-sm font-medium text-gray-700">
            Выберите резюме для отклика
          </label>
          <select
            id="resumeSelect"
            value={selectedResumeId}
            onChange={(e) => setSelectedResumeId(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
            disabled={isApplying || isLoadingResumes}
          >
            <option value="">Выберите резюме</option>
            {resumes.map(resume => (
              <option key={resume.id} value={resume.id}>
                {resume.title}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            {isLoadingResumes 
              ? "Загрузка ваших резюме..." 
              : resumes.length > 0 
                ? "Выбранное резюме будет использовано для всех откликов" 
                : "У вас нет резюме на HH.ru или не удалось их загрузить"}
          </p>
        </div>
        
        {/* Cover Letter */}
        <div>
          <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700">
            Сопроводительное письмо (опционально)
          </label>
          <textarea
            id="coverLetter"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"
            rows={4}
            placeholder="Добрый день! Заинтересовала ваша вакансия..."
            disabled={isApplying}
          />
          <p className="mt-1 text-sm text-gray-500">
            Это письмо будет отправлено с каждым откликом
          </p>
        </div>
        
        {/* Progress Bar (when applying) */}
        {isApplying && (
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                Прогресс: {progress.current} из {progress.total}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-red-600 h-2.5 rounded-full" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <div>Успешно: {results.applied}</div>
              <div>Ошибок: {results.failed}</div>
            </div>
          </div>
        )}
        
        {/* Action Button */}
        <div className="pt-4">
          <button
            onClick={startAutoApplication}
            disabled={isApplying || !selectedResumeId || !filterActive || isLoadingResumes}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isApplying ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Откликаемся...
              </>
            ) : isLoadingResumes ? (
              'Загрузка резюме...'
            ) : (
              'Начать автоматический отклик'
            )}
          </button>
          
          {!filterActive && (
            <p className="mt-2 text-sm text-amber-600">
              Пожалуйста, сохраните настройки фильтра перед запуском автоматического отклика
            </p>
          )}
          
          {resumes.length === 0 && !isLoadingResumes && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
              <p className="text-sm">
                У вас нет доступных резюме или требуется повторная авторизация на HH.ru
              </p>
              <button
                onClick={() => window.location.href = '/login'}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Войти снова
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
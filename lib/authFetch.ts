  export async function authFetch(url: string, options?: RequestInit) {
    const token = localStorage.getItem('token');
  
    const headers = new Headers(options?.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  
    const fetchOptions: RequestInit = {
      ...options,
      headers,
    };
  
    return fetch(url, fetchOptions);
  }
  
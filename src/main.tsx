import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { маршрутизатор } from '@/app/router/routes'
import { ErrorBoundary } from '@/app/layout/ErrorBoundary'
import './index.css'

const корень = document.getElementById('root')
if (!корень) throw new Error('Не найден элемент приложения')

createRoot(корень).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={маршрутизатор} />
    </ErrorBoundary>
  </StrictMode>,
)

import { useState, useEffect } from 'react'

export interface SysError {
  id: string
  timestamp: string
  message: string
  stack?: string
  url?: string
  method?: string
  status?: number
  data?: any
  type: 'FRONTEND' | 'BACKEND'
  severity: 'CRITICAL' | 'ERROR' | 'WARNING'
  view?: string
  acknowledged?: boolean
}

class ErrorManager {
  private errors: SysError[] = []
  private listeners: ((errors: SysError[]) => void)[] = []
  private openListeners: ((isOpen: boolean) => void)[] = []
  private isOpen = false

  addError(error: Omit<SysError, 'id' | 'timestamp' | 'acknowledged'>) {
    const newError: SysError = {
      ...error,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      acknowledged: false,
      view: window.location.pathname
    }
    this.errors = [newError, ...this.errors].slice(0, 100)
    this.notify()
  }

  acknowledgeError(id: string) {
    this.errors = this.errors.map(e => e.id === id ? { ...e, acknowledged: true } : e)
    this.notify()
  }

  acknowledgeAll() {
    this.errors = this.errors.map(e => ({ ...e, acknowledged: true }))
    this.notify()
  }

  getErrors() {
    return this.errors
  }

  clearErrors() {
    this.errors = []
    this.notify()
  }

  setOpen(open: boolean) {
    this.isOpen = open
    this.openListeners.forEach(l => l(this.isOpen))
  }

  getIsOpen() {
    return this.isOpen
  }

  subscribe(listener: (errors: SysError[]) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  subscribeOpen(listener: (isOpen: boolean) => void) {
    this.openListeners.push(listener)
    return () => {
      this.openListeners = this.openListeners.filter(l => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach(l => l(this.errors))
  }
}

export const errorManager = new ErrorManager()

export function useErrors() {
  const [errors, setErrors] = useState<SysError[]>(errorManager.getErrors())
  const [isOpen, setIsOpen] = useState<boolean>(errorManager.getIsOpen())

  useEffect(() => {
    const unsubErrors = errorManager.subscribe(setErrors)
    const unsubOpen = errorManager.subscribeOpen(setIsOpen)
    return () => {
      unsubErrors()
      unsubOpen()
    }
  }, [])

  return { 
    errors, 
    isOpen, 
    setOpen: (v: boolean) => errorManager.setOpen(v), 
    clearErrors: () => errorManager.clearErrors(),
    acknowledgeError: (id: string) => errorManager.acknowledgeError(id),
    acknowledgeAll: () => errorManager.acknowledgeAll()
  }
}

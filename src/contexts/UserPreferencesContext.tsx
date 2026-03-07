import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

export interface DashboardPreferences {
    leftPanelWidth: number
    showDocs: boolean
    showWorkflow: boolean
    showAnalytics: boolean
}

export interface UserPreferences {
    themeMode: ThemeMode
    themeColor: string
    compactMode: boolean
    dashboard: DashboardPreferences
    documentTree: {
        expandedByView: Record<string, string[]>
    }
}

interface UserPreferencesContextValue {
    preferences: UserPreferences
    setUserScope: (userId: string | null) => void
    updatePreferences: (updater: (prev: UserPreferences) => UserPreferences) => void
    setThemeMode: (mode: ThemeMode) => void
    setThemeColor: (color: string) => void
    setCompactMode: (compact: boolean) => void
    setDashboardPreferences: (updater: (prev: DashboardPreferences) => DashboardPreferences) => void
    setExpandedFolders: (viewKey: string, folderIds: string[]) => void
    toggleExpandedFolder: (viewKey: string, folderId: string, expanded?: boolean) => void
    resetPreferences: () => void
}

const DEFAULT_PREFERENCES: UserPreferences = {
    themeMode: 'light',
    themeColor: '#4f46e5',
    compactMode: false,
    dashboard: {
        leftPanelWidth: 25,
        showDocs: true,
        showWorkflow: true,
        showAnalytics: false,
    },
    documentTree: {
        expandedByView: {},
    },
}

const STORAGE_PREFIX = 'solutia_user_preferences'

const UserPreferencesContext = createContext<UserPreferencesContextValue | undefined>(undefined)

function getStorageKey(userId: string | null) {
    return userId ? `${STORAGE_PREFIX}:${userId}` : `${STORAGE_PREFIX}:anonymous`
}

function mergePreferences(raw?: Partial<UserPreferences>): UserPreferences {
    return {
        ...DEFAULT_PREFERENCES,
        ...raw,
        dashboard: {
            ...DEFAULT_PREFERENCES.dashboard,
            ...(raw?.dashboard || {}),
        },
        documentTree: {
            expandedByView: raw?.documentTree?.expandedByView || {},
        },
    }
}

function readStoredPreferences(userId: string | null): UserPreferences {
    if (typeof window === 'undefined') {
        return DEFAULT_PREFERENCES
    }
    try {
        const raw = localStorage.getItem(getStorageKey(userId))
        if (!raw) return DEFAULT_PREFERENCES
        return mergePreferences(JSON.parse(raw))
    } catch {
        return DEFAULT_PREFERENCES
    }
}

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
    const [userScope, setUserScopeState] = useState<string | null>(null)
    const [preferences, setPreferences] = useState<UserPreferences>(() => readStoredPreferences(null))

    useEffect(() => {
        setPreferences(readStoredPreferences(userScope))
    }, [userScope])

    useEffect(() => {
        document.documentElement.classList.toggle('dark', preferences.themeMode === 'dark')
        document.documentElement.style.setProperty('--primary-color', preferences.themeColor)
        document.documentElement.style.setProperty('--primary-color-light', `${preferences.themeColor}20`)
        document.documentElement.style.setProperty('--density-scale', preferences.compactMode ? '0.92' : '1')
        localStorage.setItem(getStorageKey(userScope), JSON.stringify(preferences))
        localStorage.setItem('solutia_theme', preferences.themeMode)
        localStorage.setItem('solutia_theme_color', preferences.themeColor)
        window.dispatchEvent(new Event('theme_changed'))
    }, [preferences, userScope])

    const setUserScope = useCallback((userId: string | null) => {
        setUserScopeState(userId)
    }, [])

    const updatePreferences = useCallback((updater: (prev: UserPreferences) => UserPreferences) => {
        setPreferences(prev => updater(prev))
    }, [])

    const setThemeMode = useCallback((mode: ThemeMode) => {
        setPreferences(prev => ({ ...prev, themeMode: mode }))
    }, [])

    const setThemeColor = useCallback((color: string) => {
        setPreferences(prev => ({ ...prev, themeColor: color }))
    }, [])

    const setCompactMode = useCallback((compact: boolean) => {
        setPreferences(prev => ({ ...prev, compactMode: compact }))
    }, [])

    const setDashboardPreferences = useCallback((updater: (prev: DashboardPreferences) => DashboardPreferences) => {
        setPreferences(prev => ({
            ...prev,
            dashboard: updater(prev.dashboard),
        }))
    }, [])

    const setExpandedFolders = useCallback((viewKey: string, folderIds: string[]) => {
        setPreferences(prev => ({
            ...prev,
            documentTree: {
                expandedByView: {
                    ...prev.documentTree.expandedByView,
                    [viewKey]: folderIds,
                },
            },
        }))
    }, [])

    const toggleExpandedFolder = useCallback((viewKey: string, folderId: string, expanded?: boolean) => {
        setPreferences(prev => {
            const current = new Set(prev.documentTree.expandedByView[viewKey] || [])
            const shouldExpand = expanded ?? !current.has(folderId)
            if (shouldExpand) current.add(folderId)
            else current.delete(folderId)

            return {
                ...prev,
                documentTree: {
                    expandedByView: {
                        ...prev.documentTree.expandedByView,
                        [viewKey]: [...current],
                    },
                },
            }
        })
    }, [])

    const resetPreferences = useCallback(() => {
        setPreferences(DEFAULT_PREFERENCES)
    }, [])

    const value = useMemo<UserPreferencesContextValue>(() => ({
        preferences,
        setUserScope,
        updatePreferences,
        setThemeMode,
        setThemeColor,
        setCompactMode,
        setDashboardPreferences,
        setExpandedFolders,
        toggleExpandedFolder,
        resetPreferences,
    }), [preferences, resetPreferences, setCompactMode, setDashboardPreferences, setExpandedFolders, setThemeColor, setThemeMode, setUserScope, toggleExpandedFolder, updatePreferences])

    return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
}

export function useUserPreferences() {
    const context = useContext(UserPreferencesContext)
    if (!context) {
        throw new Error('useUserPreferences must be used within UserPreferencesProvider')
    }
    return context
}

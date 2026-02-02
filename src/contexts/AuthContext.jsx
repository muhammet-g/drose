import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check active session on mount
        checkUser()

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event)
                setUser(session?.user ?? null)
                setLoading(false)
            }
        )

        return () => {
            authListener?.subscription?.unsubscribe()
        }
    }, [])

    const checkUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user ?? null)
        } catch (error) {
            console.error('Error checking user session:', error)
        } finally {
            setLoading(false)
        }
    }

    const signUp = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            })
            if (error) throw error
            return { data, error: null }
        } catch (error) {
            console.error('Error signing up:', error)
            return { data: null, error }
        }
    }

    const signIn = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) throw error
            return { data, error: null }
        } catch (error) {
            console.error('Error signing in:', error)
            return { data: null, error }
        }
    }

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            setUser(null)
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const value = {
        user,
        loading,
        signUp,
        signIn,
        signOut,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

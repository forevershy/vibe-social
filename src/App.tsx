import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { BottomNav } from './components/BottomNav'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { AuthPage } from './pages/Auth'
import { ForYouPage, FollowingPage, FriendsFeedPage, PostViewerPage } from './pages/Feed'
import { ProfileVideoPage } from './pages/ProfileVideo'
import { CreatePage } from './pages/Create'
import { SearchPage } from './pages/Search'
import { ProfilePage } from './pages/Profile'
import { OwnerPage } from './pages/Owner'
import { SettingsPage } from './pages/Settings'
import {
  ActivityPage,
  MessagesPage,
  ShopPage,
} from './pages/Hub'
import { LivePage } from './pages/Live'
import './App.css'
import './pages/Hub.css'

function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  return <div className="app-toast">{toast}</div>
}

function Shell() {
  const { ready } = useApp()
  const location = useLocation()
  const hideChrome = location.pathname === '/auth'
  const profileVideo = /\/u\/[^/]+\/video\//.test(location.pathname)
  const videoViewer =
    location.pathname.startsWith('/post/') || profileVideo

  if (!ready) {
    return (
      <div className="boot">
        <div className="boot-logo">Vibe</div>
      </div>
    )
  }

  if (hideChrome) {
    return (
      <div className="app-shell auth">
        <main className="app-main">
          <AuthPage />
        </main>
        <Toast />
      </div>
    )
  }

  if (profileVideo) {
    return (
      <div className="app-shell immersive">
        <Routes>
          <Route path="/u/:username/video/:postId" element={<ProfileVideoPage />} />
        </Routes>
        <Toast />
      </div>
    )
  }

  return (
    <div className={`app-shell desk${videoViewer ? ' video-viewer' : ''}`}>
      <Sidebar />
      <div className="desk-content">
        {!videoViewer && <TopBar />}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<ForYouPage />} />
            <Route path="/post/:postId" element={<PostViewerPage />} />
            <Route path="/following" element={<FollowingPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage self />} />
            <Route path="/u/:username" element={<ProfilePage />} />
            <Route path="/owner" element={<OwnerPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/friends" element={<FriendsFeedPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      {!videoViewer && <BottomNav />}
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCount } from '../lib/utils'
import { VerifiedMark } from '../components/Badge'
import { GridPreviewVideo } from '../components/GridPreviewVideo'
import './Search.css'

export function SearchPage() {
  const { search, users, posts, currentUser, follow, unfollow, isFollowing } = useApp()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')

  useEffect(() => {
    const next = params.get('q') || ''
    setQ(next)
  }, [params])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const current = params.get('q') || ''
      if (q.trim() === current) return
      if (q.trim()) setParams({ q: q.trim() })
      else setParams({})
    }, 250)
    return () => window.clearTimeout(handle)
  }, [q, params, setParams])

  const results = useMemo(() => search(q), [q, search])

  const trending = useMemo(() => {
    const counts = new Map<string, number>()
    posts.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [posts])

  const suggested = users
    .filter((u) => u.id !== currentUser?.id)
    .slice(0, 6)

  return (
    <div className="search-page">
      <header>
        <h1>{q.trim() ? 'Search' : 'Explore'}</h1>
        <div className="search-box">
          <SearchIcon size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users, captions, #tags"
            autoFocus
          />
        </div>
      </header>

      {!q.trim() ? (
        <>
          <section>
            <h2>Trending videos</h2>
            <div className="post-grid">
              {[...posts]
                .sort((a, b) => b.likes.length + b.views - (a.likes.length + a.views))
                .slice(0, 12)
                .map((p) => (
                  <Link key={p.id} to={`/post/${p.id}`} className="grid-item">
                    {p.type === 'video' ? (
                      <GridPreviewVideo src={p.mediaUrl} poster={p.posterUrl} />
                    ) : (
                      <img src={p.mediaUrl} alt="" />
                    )}
                    <span>{formatCount(p.likes.length)} likes</span>
                  </Link>
                ))}
            </div>
          </section>

          <section>
            <h2>Trending tags</h2>
            <div className="tag-cloud">
              {trending.map(([tag, count]) => (
                <button key={tag} onClick={() => setQ(`#${tag}`)}>
                  #{tag}
                  <span>{count}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2>Suggested accounts</h2>
            <div className="user-list">
              {suggested.map((u) => (
                <div key={u.id} className="user-row">
                  <Link to={`/u/${u.username}`} className="user-main">
                    <img src={u.avatar} alt="" />
                    <div>
                      <strong>
                        @{u.username}
                        <VerifiedMark badges={u.badges} />
                      </strong>
                      <span>{u.displayName} · {formatCount(u.followers.length)} followers</span>
                    </div>
                  </Link>
                  {currentUser && u.id !== currentUser.id && (
                    <button
                      className={isFollowing(u.id) ? 'ghost' : 'solid'}
                      onClick={() => (isFollowing(u.id) ? unfollow(u.id) : follow(u.id))}
                    >
                      {isFollowing(u.id) ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <section>
            <h2>Accounts</h2>
            {results.users.length === 0 ? (
              <p className="none">No users found</p>
            ) : (
              <div className="user-list">
                {results.users.map((u) => (
                  <div key={u.id} className="user-row">
                    <Link to={`/u/${u.username}`} className="user-main">
                      <img src={u.avatar} alt="" />
                      <div>
                        <strong>
                          @{u.username}
                          <VerifiedMark badges={u.badges} />
                        </strong>
                        <span>{u.bio || u.displayName}</span>
                      </div>
                    </Link>
                    {currentUser && u.id !== currentUser.id && (
                      <button
                        className={isFollowing(u.id) ? 'ghost' : 'solid'}
                        onClick={() => (isFollowing(u.id) ? unfollow(u.id) : follow(u.id))}
                      >
                        {isFollowing(u.id) ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {results.tags.length > 0 && (
            <section>
              <h2>Tags</h2>
              <div className="tag-cloud">
                {results.tags.map((tag) => (
                  <button key={tag} onClick={() => setQ(`#${tag}`)}>
                    #{tag}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2>Posts</h2>
            {results.posts.length === 0 ? (
              <p className="none">No posts found</p>
            ) : (
              <div className="post-grid">
                {results.posts.map((p) => (
                  <Link key={p.id} to={`/post/${p.id}`} className="grid-item">
                    {p.type === 'video' ? (
                      <GridPreviewVideo src={p.mediaUrl} poster={p.posterUrl} />
                    ) : (
                      <img src={p.mediaUrl} alt="" />
                    )}
                    <span>{formatCount(p.likes.length)} likes</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

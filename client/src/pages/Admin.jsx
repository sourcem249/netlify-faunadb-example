import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatWhen } from '../api';
import { useAuth } from '../auth';

export default function Admin() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('people');

  async function load() {
    const [people, journal] = await Promise.all([
      api('/api/admin/overview'),
      api('/api/entries'),
    ]);
    setOverview(people);
    setEntries(journal.entries);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function changeRole(person, role) {
    setError('');
    try {
      await api(`/api/admin/users/${person.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeUser(person) {
    if (!window.confirm(`${person.displayName} 님과 그 일지를 지울까요?`)) return;
    setError('');
    try {
      await api(`/api/admin/users/${person.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeEntry(entry) {
    if (!window.confirm(`「${entry.title}」 일지를 지울까요?`)) return;
    setError('');
    try {
      await api(`/api/entries/${entry.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="album-band py-4">
      <div className="container-fluid">
        <div className="row">
          <aside className="col-md-3 col-lg-2 mb-4">
            <div className="valley-panel admin-side">
              <h1 className="h4">이장 마당</h1>
              <div className="nav flex-column">
                <button type="button" className={`nav-link text-start ${tab === 'people' ? 'active' : ''}`} onClick={() => setTab('people')}>주민</button>
                <button type="button" className={`nav-link text-start ${tab === 'entries' ? 'active' : ''}`} onClick={() => setTab('entries')}>모든 일지</button>
              </div>
            </div>
          </aside>
          <div className="col-md-9 col-lg-10">
            {error && <div className="alert alert-danger">{error}</div>}
            {overview && (
              <div className="row g-3 mb-4">
                <Stat label="주민" value={overview.counts.users} />
                <Stat label="일지" value={overview.counts.entries} />
                <Stat label="사진·영상" value={overview.counts.media} />
              </div>
            )}
            {!overview && !error && <p>마당을 정리하는 중...</p>}
            {tab === 'people' && overview && (
              <div className="valley-panel table-wrap">
                <h2 className="h4">주민 명부</h2>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>이름</th>
                        <th>아이디</th>
                        <th>역할</th>
                        <th>일지</th>
                        <th>등록</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.users.map((person) => (
                        <tr key={person.id}>
                          <td>{person.displayName}</td>
                          <td>{person.username}</td>
                          <td>{person.role === 'admin' ? '이장' : '주민'}</td>
                          <td>{person.entryCount}</td>
                          <td>{formatWhen(person.createdAt)}</td>
                          <td>
                            {person.id === user.id ? (
                              <span className="small">지금 이장</span>
                            ) : (
                              <div className="d-flex flex-wrap gap-2">
                                <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => changeRole(person, person.role === 'admin' ? 'user' : 'admin')}>
                                  {person.role === 'admin' ? '주민으로' : '이장으로'}
                                </button>
                                <button type="button" className="btn btn-sm btn-berry" onClick={() => removeUser(person)}>내보내기</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab === 'entries' && (
              <div className="valley-panel table-wrap">
                <h2 className="h4">마을 일지 전체</h2>
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>제목</th>
                        <th>쓴 사람</th>
                        <th>분류</th>
                        <th>파일</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id}>
                          <td><Link to={`/entries/${entry.id}`}>{entry.title}</Link></td>
                          <td>{entry.author.displayName}</td>
                          <td>{entry.season} · {entry.category}</td>
                          <td>{entry.media.length}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Link className="btn btn-sm btn-honey" to={`/entries/${entry.id}/edit`}>고치기</Link>
                              <button type="button" className="btn btn-sm btn-berry" onClick={() => removeEntry(entry)}>지우기</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="col-sm-4">
      <div className="valley-panel stat-panel">
        <p className="mb-1">{label}</p>
        <p className="display-6 mb-0">{value}</p>
      </div>
    </div>
  );
}

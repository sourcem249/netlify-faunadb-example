import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatWhen } from '../api';
import { useAuth } from '../auth';

export default function EntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [entry, setEntry] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setEntry(null);
    api(`/api/entries/${id}`)
      .then((data) => setEntry(data.entry))
      .catch((err) => setError(err.message));
  }, [id]);

  async function remove() {
    if (!window.confirm('이 일지를 지울까요? 붙은 사진과 영상도 함께 사라집니다.')) return;
    try {
      await api(`/api/entries/${id}`, { method: 'DELETE' });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !entry) {
    return <section className="album-band py-5"><div className="container"><div className="alert alert-danger">{error}</div></div></section>;
  }
  if (!entry) {
    return <section className="album-band py-5"><div className="container"><p>일지를 찾는 중...</p></div></section>;
  }

  const canEdit = user && (user.id === entry.author.id || user.role === 'admin');

  return (
    <section className="album-band py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-9">
            <article className="valley-panel">
              <div className="d-flex flex-wrap gap-2 mb-2">
                <span className="badge text-bg-light">{entry.season}</span>
                <span className="badge text-bg-light">{entry.category}</span>
              </div>
              <h1 className="h2">{entry.title}</h1>
              <p className="text-secondary">
                {entry.author.displayName} · 적음 {formatWhen(entry.createdAt)}
                {entry.updatedAt !== entry.createdAt && ` · 고침 ${formatWhen(entry.updatedAt)}`}
              </p>
              <p className="entry-body">{entry.body}</p>
              {entry.media.length > 0 && (
                <div className="row g-3 mt-1">
                  {entry.media.map((item) => (
                    <div className="col-md-6" key={item.id}>
                      {item.kind === 'video' ? (
                        <video className="cover" controls src={item.url} preload="metadata">
                          <track kind="captions" />
                        </video>
                      ) : (
                        <a href={item.url} target="_blank" rel="noreferrer">
                          <img className="cover" src={item.url} alt={`${entry.title} 사진`} />
                        </a>
                      )}
                      <p className="small mt-2 mb-0">{item.originalName}</p>
                    </div>
                  ))}
                </div>
              )}
              {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
              <div className="d-flex flex-wrap gap-2 mt-4">
                <Link className="btn btn-outline-dark" to="/">목록</Link>
                {canEdit && <Link className="btn btn-honey" to={`/entries/${entry.id}/edit`}>고치기</Link>}
                {canEdit && <button className="btn btn-berry" type="button" onClick={remove}>지우기</button>}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

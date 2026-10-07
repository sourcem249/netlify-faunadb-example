import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, CATEGORIES, SEASONS } from '../api';

export default function EntryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [existing, setExisting] = useState([]);
  const [removeIds, setRemoveIds] = useState([]);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(!editing);
  const [form, setForm] = useState({
    title: '',
    body: '',
    category: '작물',
    season: '봄',
  });

  useEffect(() => {
    if (!editing) return;
    api(`/api/entries/${id}`)
      .then((data) => {
        setForm({
          title: data.entry.title,
          body: data.entry.body,
          category: data.entry.category,
          season: data.entry.season,
        });
        setExisting(data.entry.media);
        setReady(true);
      })
      .catch((err) => setError(err.message));
  }, [editing, id]);

  function onPick(event) {
    setFiles(Array.from(event.target.files || []));
  }

  function toggleRemove(mediaId) {
    setRemoveIds((current) => (
      current.includes(mediaId) ? current.filter((item) => item !== mediaId) : current.concat(mediaId)
    ));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const data = new FormData();
    data.set('title', form.title);
    data.set('body', form.body);
    data.set('category', form.category);
    data.set('season', form.season);
    if (removeIds.length) data.set('removeMediaIds', removeIds.join(','));
    files.forEach((file) => data.append('files', file));
    try {
      const path = editing ? `/api/entries/${id}` : '/api/entries';
      const method = editing ? 'PUT' : 'POST';
      const result = await api(path, { method, body: data });
      navigate(`/entries/${result.entry.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!ready && !error) {
    return <section className="album-band py-5"><div className="container"><p>일지를 불러오는 중...</p></div></section>;
  }

  return (
    <section className="album-band py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <form className="valley-panel" onSubmit={onSubmit}>
              <h1 className="h2">{editing ? '일지 고치기' : '새 일지'}</h1>
              <p>사진과 영상은 합쳐서 6개, 파일당 40MB까지입니다. jpg, png, gif, webp, mp4, webm.</p>
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="mb-3">
                <label className="form-label" htmlFor="title">제목</label>
                <input id="title" className="form-control" required maxLength={80} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </div>
              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="form-label" htmlFor="category">분류</label>
                  <select id="category" className="form-select" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                    {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="col-sm-6">
                  <label className="form-label" htmlFor="season">계절</label>
                  <select id="season" className="form-select" value={form.season} onChange={(event) => setForm({ ...form, season: event.target.value })}>
                    {SEASONS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
              </div>
              <div className="my-3">
                <label className="form-label" htmlFor="body">내용</label>
                <textarea id="body" className="form-control" rows={6} required maxLength={4000} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} />
              </div>
              {existing.length > 0 && (
                <fieldset className="mb-3">
                  <legend className="form-label">이미 붙은 파일</legend>
                  <div className="row g-2">
                    {existing.map((item) => (
                      <div className="col-6 col-md-4" key={item.id}>
                        <label className={`existing-file ${removeIds.includes(item.id) ? 'is-removed' : ''}`}>
                          {item.kind === 'video'
                            ? <video src={item.url} muted preload="metadata" />
                            : <img src={item.url} alt="" />}
                          <span className="form-check mt-2">
                            <input className="form-check-input" type="checkbox" checked={removeIds.includes(item.id)} onChange={() => toggleRemove(item.id)} />
                            <span className="form-check-label">빼기</span>
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}
              <div className="mb-4">
                <label className="form-label" htmlFor="files">사진·영상 추가</label>
                <input id="files" className="form-control" type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm" onChange={onPick} />
                {files.length > 0 && (
                  <ul className="mt-2 mb-0">
                    {files.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}</li>)}
                  </ul>
                )}
              </div>
              <button className="btn btn-leaf" type="submit" disabled={saving}>
                {saving ? '저장하는 중...' : '수첩에 남기기'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

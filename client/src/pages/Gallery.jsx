import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Gallery() {
  const [items, setItems] = useState(null);
  const [kind, setKind] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/entries')
      .then((data) => {
        const flat = data.entries.flatMap((entry) => entry.media.map((media) => ({
          ...media,
          entryId: entry.id,
          title: entry.title,
          author: entry.author.displayName,
        })));
        setItems(flat);
      })
      .catch((err) => setError(err.message));
  }, []);

  const shown = (items || []).filter((item) => kind === 'all' || item.kind === kind);

  return (
    <section className="album-band py-5">
      <div className="container">
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
          <div>
            <h1 className="h2 mb-1">사진첩</h1>
            <p className="mb-0">일지에 붙은 사진과 영상을 모아서 봅니다.</p>
          </div>
          <div className="btn-group" role="group" aria-label="사진첩 필터">
            <button type="button" className={`btn ${kind === 'all' ? 'btn-leaf' : 'btn-outline-dark'}`} onClick={() => setKind('all')}>모두</button>
            <button type="button" className={`btn ${kind === 'image' ? 'btn-leaf' : 'btn-outline-dark'}`} onClick={() => setKind('image')}>사진</button>
            <button type="button" className={`btn ${kind === 'video' ? 'btn-leaf' : 'btn-outline-dark'}`} onClick={() => setKind('video')}>영상</button>
          </div>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        {items === null && !error && <p>사진첩을 여는 중...</p>}
        {items && shown.length === 0 && <div className="valley-panel">이 분류에는 아직 파일이 없습니다.</div>}
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
          {shown.map((item) => (
            <div className="col" key={item.id}>
              <article className="valley-panel h-100">
                {item.kind === 'video' ? (
                  <video className="cover" controls preload="metadata" src={item.url}>
                    <track kind="captions" />
                  </video>
                ) : (
                  <img className="cover" src={item.url} alt={item.title} />
                )}
                <h2 className="h5 mt-3 mb-1">
                  <Link to={`/entries/${item.entryId}`} className="entry-title">{item.title}</Link>
                </h2>
                <p className="mb-0 small">{item.author} · {item.kind === 'video' ? '영상' : '사진'}</p>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

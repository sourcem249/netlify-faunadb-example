import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, CATEGORIES, SEASONS } from '../api';
import EntryCard from '../components/EntryCard';

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  const category = params.get('category') || '';
  const season = params.get('season') || '';
  const q = params.get('q') || '';

  useEffect(() => {
    const query = new URLSearchParams();
    if (category) query.set('category', category);
    if (season) query.set('season', season);
    if (q) query.set('q', q);
    const suffix = query.toString() ? `?${query}` : '';
    setEntries(null);
    api(`/api/entries${suffix}`)
      .then((data) => setEntries(data.entries))
      .catch((err) => setError(err.message));
  }, [category, season, q]);

  function onSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = {};
    for (const key of ['q', 'category', 'season']) {
      const value = String(form.get(key) || '').trim();
      if (value) next[key] = value;
    }
    setParams(next);
  }

  return (
    <>
      <section className="valley-hero py-5">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-7 text-center text-lg-start">
              <p className="hero-kicker mb-2">마을의 하루를 적는 곳</p>
              <h1 className="display-5 mb-3">밭일과 저녁 식탁을 수첩에 남기세요</h1>
              <p className="lead mb-4">
                작물, 날씨, 요리처럼 하루의 일을 글로 적고 사진과 영상을 붙입니다.
                주민은 자기 일지를 고치고, 이장은 마을 전체를 돌봅니다.
              </p>
              <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-lg-start">
                <Link className="btn btn-leaf btn-lg" to="/entries/new">일지 쓰기</Link>
                <Link className="btn btn-honey btn-lg" to="/gallery">사진첩 보기</Link>
              </div>
            </div>
            <div className="col-lg-5">
              <img className="img-fluid valley-hero-art" src="/art/field.png" alt="언덕과 작은 집이 있는 이슬골 들판 그림" />
            </div>
          </div>
        </div>
      </section>

      <section className="album-band py-5">
        <div className="container">
          <form className="row g-2 align-items-end mb-4" onSubmit={onSubmit} key={`${q}|${category}|${season}`}>
            <div className="col-md-5">
              <label className="form-label" htmlFor="q">찾기</label>
              <input id="q" name="q" className="form-control" defaultValue={q} placeholder="제목, 내용, 이름" />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label" htmlFor="category">분류</label>
              <select id="category" name="category" className="form-select" defaultValue={category}>
                <option value="">모두</option>
                {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label" htmlFor="season">계절</label>
              <select id="season" name="season" className="form-select" defaultValue={season}>
                <option value="">모두</option>
                {SEASONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button className="btn btn-leaf flex-grow-1" type="submit">고르기</button>
              <Link className="btn btn-outline-dark" to="/">지우기</Link>
            </div>
          </form>

          {error && <div className="alert alert-danger">{error}</div>}
          {entries === null && !error && <p>일지를 펼치는 중...</p>}
          {entries?.length === 0 && (
            <div className="valley-panel text-center">
              <h2 className="h4">아직 적힌 일지가 없습니다</h2>
              <p className="mb-3">첫 기록을 남겨 보세요.</p>
              <Link className="btn btn-leaf" to="/entries/new">일지 쓰기</Link>
            </div>
          )}
          <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
            {entries?.map((entry) => (
              <div className="col" key={entry.id}>
                <EntryCard entry={entry} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

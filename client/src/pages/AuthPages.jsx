import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function AuthPages({ mode }) {
  const isLogin = mode === 'login';
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      if (isLogin) {
        await login(form.get('username'), form.get('password'));
      } else {
        await register({
          username: form.get('username'),
          displayName: form.get('displayName'),
          password: form.get('password'),
        });
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  return (
    <section className="album-band py-5">
      <div className="container">
        <div className="row justify-content-center g-4">
          <div className="col-md-6">
            <form className="valley-panel" onSubmit={onSubmit}>
              <h1 className="h2">{isLogin ? '마을 입장' : '주민 등록'}</h1>
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="mb-3">
                <label className="form-label" htmlFor="username">아이디</label>
                <input id="username" name="username" className="form-control" required minLength={2} maxLength={20} autoComplete="username" />
              </div>
              {!isLogin && (
                <div className="mb-3">
                  <label className="form-label" htmlFor="displayName">마을에서 불릴 이름</label>
                  <input id="displayName" name="displayName" className="form-control" required maxLength={20} />
                </div>
              )}
              <div className="mb-4">
                <label className="form-label" htmlFor="password">비밀번호</label>
                <input id="password" name="password" type="password" className="form-control" required minLength={6} autoComplete={isLogin ? 'current-password' : 'new-password'} />
              </div>
              <button className="btn btn-leaf" type="submit" disabled={pending}>
                {pending ? '확인하는 중...' : isLogin ? '들어가기' : '등록하기'}
              </button>
              <p className="mt-3 mb-0">
                {isLogin
                  ? <>처음이라면 <Link to="/register">주민 등록</Link></>
                  : <>이미 있다면 <Link to="/login">로그인</Link></>}
              </p>
            </form>
          </div>
          {isLogin && (
            <div className="col-md-5">
              <aside className="valley-panel">
                <h2 className="h4">둘러보기 계정</h2>
                <p>비밀번호는 이 예제용입니다.</p>
                <ul className="list-unstyled mb-0">
                  <li className="mb-2"><strong>이장</strong> mayor / orchard-gate</li>
                  <li className="mb-2"><strong>주민</strong> sprout / dew-drop</li>
                  <li><strong>주민</strong> dalgong / sweet-bean</li>
                </ul>
              </aside>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

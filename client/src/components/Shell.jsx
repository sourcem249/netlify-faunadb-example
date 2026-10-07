import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Shell({ children }) {
  const { user, logout } = useAuth();

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark valley-nav sticky-top">
        <div className="container">
          <NavLink className="navbar-brand d-flex align-items-center gap-2" to="/">
            <Sprout />
            이슬골 마을 수첩
          </NavLink>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#valleyNav" aria-controls="valleyNav" aria-expanded="false" aria-label="메뉴 열기">
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="valleyNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <NavLink className="nav-link" to="/" end>일지</NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/gallery">사진첩</NavLink>
              </li>
              {user?.role === 'admin' && (
                <li className="nav-item">
                  <NavLink className="nav-link" to="/admin">이장 마당</NavLink>
                </li>
              )}
            </ul>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {user === undefined ? null : user ? (
                <>
                  <span className="valley-who">
                    {user.displayName}
                    <span className={`badge ms-2 ${user.role === 'admin' ? 'text-bg-warning' : 'text-bg-light'}`}>
                      {user.role === 'admin' ? '이장' : '주민'}
                    </span>
                  </span>
                  <NavLink className="btn btn-honey btn-sm" to="/entries/new">일지 쓰기</NavLink>
                  <button className="btn btn-outline-cream btn-sm" type="button" onClick={logout}>로그아웃</button>
                </>
              ) : (
                <>
                  <NavLink className="btn btn-outline-cream btn-sm" to="/login">로그인</NavLink>
                  <NavLink className="btn btn-honey btn-sm" to="/register">회원가입</NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="valley-footer py-4 mt-auto">
        <div className="container small">
          <p className="mb-1">이슬골은 꾸며 낸 마을입니다. 농사 일지와 사진, 영상을 주민과 이장이 함께 보관합니다.</p>
          <p className="mb-0 text-secondary">
            화면 뼈대는 Bootstrap 앨범·대시보드 예제, 창틀은 Kenney Fantasy UI Borders (CC0)를 썼습니다.
            스타듀밸리의 그림, 글꼴, 마을 이름은 쓰지 않았습니다.
          </p>
        </div>
      </footer>
    </>
  );
}

function Sprout() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" fill="#e8b15a" />
      <path d="M16 26c0-8 6-10 10-12-4 0-8 2-10 6-2-4-6-6-10-6 4 2 10 4 10 12z" fill="#214833" />
    </svg>
  );
}

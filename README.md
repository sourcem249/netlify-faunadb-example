# 이슬골 마을 수첩

농사 일지를 적고, 사진과 영상을 붙여 두고, 다시 열어 보는 마을 수첩입니다. 예전 Netlify + Fauna 할 일 예제의 만들기/고치기/지우기 흐름을 주민 계정과 파일 보관으로 넓혔습니다.

회원가입으로 만든 계정은 **주민**입니다. **이장**은 모든 일지를 고치거나 지우고, 주민을 이장으로 올리거나 내보낼 수 있습니다.

## 둘러보기 계정

| 역할 | 아이디 | 비밀번호 |
| --- | --- | --- |
| 이장 | `mayor` | `orchard-gate` |
| 주민 | `sprout` | `dew-drop` |
| 주민 | `dalgong` | `sweet-bean` |

## 실행

```bash
npm install
npm run dev
```

브라우저에서 http://127.0.0.1:5173 을 엽니다. API는 http://127.0.0.1:8787 입니다.

```bash
npm test
npm run build
npm start
```

`npm start`는 빌드된 화면과 API를 한 프로세스에서 엽니다. 데이터는 `data/dewglen.sqlite`, 파일은 `data/uploads/`에 있습니다. 계정 파일과 업로드는 git에 넣지 않습니다.

## 화면을 어디서 가져왔나

직접 픽셀 그림을 지어내지 않고, 이미 공개된 레이아웃과 창틀을 붙였습니다.

- [Bootstrap 5.3 Album](https://getbootstrap.com/docs/5.3/examples/album/) — 위쪽 소개와 카드 격자. MIT.
- [Bootstrap 5.3 Dashboard](https://getbootstrap.com/docs/5.3/examples/dashboard/) — 이장 마당의 옆 메뉴와 표. MIT.
- [Bootstrap Cards](https://getbootstrap.com/docs/5.3/components/card/) — 카드 안 제목, 버튼, 간격.
- [Kenney Fantasy UI Borders](https://opengameart.org/content/fantasy-ui-borders) — 일지 창틀. CC0. 제작자 Kenney (www.kenney.nl).
- [Jua](https://fonts.google.com/specimen/Jua), [Noto Sans KR](https://fonts.google.com/specimen/Noto+Sans+KR) — 제목과 본문. SIL Open Font License.

들판, 호박, 비, 수프 그림과 짧은 들판 영상은 이 저장소에서 만든 단순한 그림입니다.

스타듀밸리의 스프라이트, UI 이미지, 로고, 글꼴, 캐릭터, 지명은 쓰지 않았습니다. 따뜻한 농사 마을의 느낌만 참고했고, 창과 버튼의 실제 모양은 위 공개 자료에서 왔습니다.

## 파일

사진 `jpg` `png` `gif` `webp`, 영상 `mp4` `webm`. 일지당 6개, 파일당 40MB.

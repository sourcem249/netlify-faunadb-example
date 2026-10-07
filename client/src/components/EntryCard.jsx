import { Link } from 'react-router-dom';
import { formatWhen } from '../api';

export default function EntryCard({ entry }) {
  const cover = entry.media[0];
  return (
    <article className="valley-panel h-100 d-flex flex-column">
      <Link to={`/entries/${entry.id}`} className="cover-link">
        <Cover media={cover} title={entry.title} />
      </Link>
      <div className="d-flex flex-wrap gap-2 mt-3">
        <span className={`badge season season-${seasonKey(entry.season)}`}>{entry.season}</span>
        <span className="badge text-bg-light">{entry.category}</span>
        {entry.media.some((item) => item.kind === 'video') && <span className="badge text-bg-dark">영상</span>}
      </div>
      <h2 className="h4 mt-2 mb-1">
        <Link to={`/entries/${entry.id}`} className="entry-title">{entry.title}</Link>
      </h2>
      <p className="entry-excerpt mb-3">{entry.body}</p>
      <div className="mt-auto d-flex justify-content-between align-items-center gap-2">
        <small>{entry.author.displayName}</small>
        <small className="text-secondary">{formatWhen(entry.createdAt)}</small>
      </div>
    </article>
  );
}

export function Cover({ media, title }) {
  if (!media) {
    return <div className="cover cover-empty" role="img" aria-label="그림 없음">빈 들판</div>;
  }
  if (media.kind === 'video') {
    return (
      <div className="cover cover-video">
        <video src={media.url} muted playsInline preload="metadata" aria-label={title} />
        <span className="play-pill">영상</span>
      </div>
    );
  }
  return <img className="cover" src={media.url} alt="" />;
}

function seasonKey(season) {
  return { 봄: 'spring', 여름: 'summer', 가을: 'autumn', 겨울: 'winter' }[season] || 'spring';
}

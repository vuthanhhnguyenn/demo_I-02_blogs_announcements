import { BLOG_SORT_KEYS } from '../_constants/blog.constants';
import { useNoticeFilters } from './use-notice-filters.hook';

/** Blog list URL filter state: the shared notice filters with the blog type and sort keys. */
export function useBlogFilters() {
  return useNoticeFilters({ type: 'blog', sortKeys: BLOG_SORT_KEYS });
}

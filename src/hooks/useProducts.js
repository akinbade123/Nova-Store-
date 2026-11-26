import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { productService } from '../services/productService';

/**
 * Resolves a list of product ids (cart lines, wishlist) to products, in the same order.
 * Ids that aren't cached yet are fetched in one request. `loading` stays true until every
 * id is either loaded or confirmed unavailable; unavailable ids are left out of `products`.
 * In sample-data mode everything is cached already, so this never loads.
 */
export function useProducts(ids) {
  const version = useSyncExternalStore(productService.subscribe, productService.cacheVersion);
  const key = ids.join(',');

  useEffect(() => {
    if (key) productService.loadByIds(key.split(','));
  }, [key]);

  return useMemo(() => {
    const list = key ? key.split(',') : [];
    return {
      products: list.map((id) => productService.findById(id)).filter(Boolean),
      loading: list.some((id) => !productService.isResolved(id)),
    };
    // `version` changes whenever the cache does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);
}

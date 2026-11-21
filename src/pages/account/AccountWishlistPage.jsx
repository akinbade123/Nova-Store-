import { WishlistGrid } from '../../components/wishlist/WishlistGrid';
import { AccountSection } from '../../layouts/AccountLayout';
import { useWishlist } from '../../context/WishlistContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function AccountWishlistPage() {
  useDocumentTitle('Wishlist');
  const { count } = useWishlist();
  return (
    <AccountSection
      title="Wishlist"
      description={count > 0 ? `${count} saved ${count === 1 ? 'item' : 'items'}. Prices and stock update live.` : 'Items you save will appear here.'}
    >
      <WishlistGrid columns="grid-cols-2 md:grid-cols-3" />
    </AccountSection>
  );
}

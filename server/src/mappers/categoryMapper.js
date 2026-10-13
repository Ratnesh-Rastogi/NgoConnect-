// Pure mapper function to format Category records
export const toSafeCategory = (category) => {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    slug: category.slug
  };
};

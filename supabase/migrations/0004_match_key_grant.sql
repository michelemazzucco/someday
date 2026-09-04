-- match_items reads item.match_key in its WHERE and score expressions, and column
-- privileges cover every column a query touches, not only the ones it returns.
-- Without this grant anonymous search fails outright with "permission denied".
-- match_key is derived from name, designer and manufacturer, which anon already reads.
grant select (match_key) on public.item to anon;

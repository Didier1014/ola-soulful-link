CREATE OR REPLACE FUNCTION public.increment_balance(_user_id uuid, _amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_bal numeric;
BEGIN
  UPDATE public.profiles
     SET balance_mzn = COALESCE(balance_mzn, 0) + _amount
   WHERE id = _user_id
  RETURNING balance_mzn INTO new_bal;
  RETURN new_bal;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_balance(uuid, numeric) TO service_role;
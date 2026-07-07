-- Reshape friendships for pair integrity (0008 and 0009 ship in the same PR,
-- so the table is empty everywhere and a drop/recreate is safe):
-- * a unique index on the unordered pair, so concurrent mutual invites can't
--   create both (A,B) and (B,A) rows
-- * a 'declined' status, so declining is sticky: the requester still sees
--   their invite as pending and re-requests are rejected instead of
--   re-surfacing for the decliner
DROP TABLE friendships;

CREATE TABLE friendships (
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at INTEGER NOT NULL,
  accepted_at INTEGER,
  PRIMARY KEY (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX idx_friendships_pair
  ON friendships (MIN(requester_id, addressee_id), MAX(requester_id, addressee_id));

CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);

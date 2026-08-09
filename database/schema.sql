CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    join_code VARCHAR(8) UNIQUE NOT NULL,
    theme VARCHAR(100),
    status VARCHAR(20) DEFAULT 'waiting' NOT NULL,
    current_beat_number INTEGER DEFAULT 1 NOT NULL,
    voting_ends_at TIMESTAMP,
    spectators_can_vote BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Players, hosts, and spectators are all members of a game.
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CHECK (role IN ('host', 'player', 'spectator'))
);

-- Audio files are stored elsewhere. The database only stores their URLs.
CREATE TABLE sounds (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    audio_url TEXT NOT NULL
);

-- sequence_data contains sample steps and piano-roll notes for Tone.js.
CREATE TABLE beats (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE NOT NULL,
    beat_number INTEGER NOT NULL,
    bpm INTEGER DEFAULT 120 NOT NULL,
    loop_steps INTEGER DEFAULT 16 NOT NULL,
    sequence_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (game_id, member_id),
    UNIQUE (game_id, beat_number)
);

CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    beat_id INTEGER REFERENCES beats(id) ON DELETE CASCADE NOT NULL,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE NOT NULL,
    stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    UNIQUE (beat_id, member_id)
);
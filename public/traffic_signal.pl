% ============================================================
%  Traffic signal duration from traffic density (SWI-Prolog)
%
%  Facts      : traffic_density(Road, VehiclesPerMinute)
%  Rules      : density_level/2, signal_for_level/2, duration_seconds/2
%  Top goal   : signal_duration(Road, Length, Seconds)
%
%  Run:   swipl -s traffic_signal.pl
%         ?- signal_duration(main_road, Length, Seconds).
%         ?- report.
% ============================================================

% ---- Facts: density reported by each road sensor ----
traffic_density(main_road,      72).
traffic_density(market_street,  45).
traffic_density(hospital_lane,  18).
traffic_density(airport_road,   66).
traffic_density(ring_road,      28).
traffic_density(harbour_gate,   30).
traffic_density(depot_street,   60).

% ---- Rule 1: classify density as low, medium or high ----
%   low    : fewer than 30 vehicles / minute
%   medium : 30 to 59 vehicles / minute
%   high   : 60 or more vehicles / minute
density_level(Road, low) :-
    traffic_density(Road, V),
    V < 30.
density_level(Road, medium) :-
    traffic_density(Road, V),
    V >= 30,
    V < 60.
density_level(Road, high) :-
    traffic_density(Road, V),
    V >= 60.

% ---- Rule 2: map the level to a signal length ----
signal_for_level(low,    short).
signal_for_level(medium, medium).
signal_for_level(high,   long).

% ---- Rule 3: map the signal length to green seconds ----
duration_seconds(short,  20).
duration_seconds(medium, 40).
duration_seconds(long,   60).

% ---- Top-level rule ----
signal_duration(Road, Length, Seconds) :-
    density_level(Road, Level),
    signal_for_level(Level, Length),
    duration_seconds(Length, Seconds).

% ---- Report: one line for every road (multiple roads at once) ----
report :-
    forall(
        traffic_density(Road, V),
        (   signal_duration(Road, Length, Seconds),
            density_level(Road, Level),
            format("~w: ~w vehicles/min -> ~w density -> ~w signal (~w s)~n",
                   [Road, V, Level, Length, Seconds])
        )
    ).

% ---- Example queries ----
%   ?- density_level(main_road, L).                  L = high.
%   ?- signal_duration(hospital_lane, Len, Sec).     Len = short, Sec = 20.
%   ?- signal_duration(R, long, _).                  roads that need a long signal.

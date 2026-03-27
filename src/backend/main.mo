import Text "mo:core/Text";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import List "mo:core/List";

actor {
  type PlayerProfile = {
    name : Text;
    age : Nat;
    avatar : Text;
    theme : Text;
  };

  type Session = {
    date : Time.Time;
    points : Nat;
  };

  module PlayerProfile {
    public func compare(a : PlayerProfile, b : PlayerProfile) : Order.Order {
      Text.compare(a.name, b.name);
    };
  };

  let profiles = Map.empty<Text, PlayerProfile>();
  let sessions = Map.empty<Text, List.List<Session> >();

  public shared ({ caller }) func saveProfile(name : Text, age : Nat, avatar : Text, theme : Text) : async () {
    let profile : PlayerProfile = {
      name;
      age;
      avatar;
      theme;
    };
    profiles.add(name, profile);
  };

  public query ({ caller }) func getProfile(playerName : Text) : async PlayerProfile {
    switch (profiles.get(playerName)) {
      case (null) { Runtime.trap("Profile not found") };
      case (?profile) { profile };
    };
  };

  public query ({ caller }) func getAllProfiles() : async [PlayerProfile] {
    profiles.values().toArray().sort();
  };

  public shared ({ caller }) func submitScore(playerName : Text, points : Nat) : async () {
    let today = Time.now();

    if (points == 0) {
      return;
    };

    let playerSessions = switch (sessions.get(playerName)) {
      case (null) { List.empty<Session>() };
      case (?s) { s };
    };

    let todaysSessions = playerSessions.filter(
      func(s) {
        let diff = Time.now() - s.date;
        let dayInNanos = 86_400_000_000_000;
        diff < dayInNanos;
      }
    );

    if (todaysSessions.size() >= 5) {
      Runtime.trap("Maximum daily sessions reached");
    };

    let newSession : Session = {
      date = today;
      points;
    };

    playerSessions.add(newSession);
    sessions.add(playerName, playerSessions);
  };

  public query ({ caller }) func getPlayerStats(playerName : Text) : async (Nat, Nat) {
    let playerSessions = switch (sessions.get(playerName)) {
      case (null) { List.empty<Session>() };
      case (?s) { s };
    };

    let totalPoints = playerSessions.foldLeft(
      0,
      func(acc, session) { acc + session.points },
    );

    (totalPoints, playerSessions.size());
  };

  public query ({ caller }) func getClues(theme : Text) : async [Text] {
    switch (theme) {
      case ("pirates") {
        [
          "I have a hook and a peg leg. Who am I?",
          "X marks the spot. What is it?",
          "I sail the seas looking for gold. What am I?",
          "I wear an eye patch. Who am I?",
          "I bury treasure on islands. What do I do?",
        ];
      };
      case ("space") {
        [
          "I fly through the galaxy. What am I?",
          "I wear a spacesuit. Who am I?",
          "I land on the moon. What did I do?",
          "I have a rocket engine. What is it?",
          "I see stars through a telescope. What do I do?",
        ];
      };
      case ("jungle") {
        [
          "I swing from vines. Who am I?",
          "I live in the rainforest. What is it?",
          "I have stripes and roar. Who am I?",
          "I climb trees for bananas. What do I do?",
          "I have sharp claws and hunt at night. What is it?",
        ];
      };
      case ("mystery") {
        [
          "I solve clues to find the answer. What am I?",
          "I wear a magnifying glass around my neck. Who am I?",
          "I look for hidden secrets. What do I do?",
          "I follow footprints to solve a case. What is it?",
          "I piece together puzzles to solve the mystery. What do I do?",
        ];
      };
      case (_) { Runtime.trap("Theme not found") };
    };
  };
};

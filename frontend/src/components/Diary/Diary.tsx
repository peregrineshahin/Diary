import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrash,
  faSave,
  faBookOpen,
  faCheck,
  faTimes,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import { formatDate } from "../../utils";
import { toast } from "react-toastify";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Header from "../Header/Header";
import Drawing, { RecordedStroke } from "../Drawing/Drawing";
import "./styles.scss";

const Diary = () => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [entries, setEntries] = useState<any[] | null>(null);
  const [newEntry, setNewEntry] = useState<string>("");

  const [dateFrom, setDateFrom] = useState<string>(
    dayjs().format("YYYY-MM-DD"),
  );
  const [dateTo, setDateTo] = useState<string>(dayjs().format("YYYY-MM-DD"));
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);
  const [editEntryId, setEditEntryId] = useState<number | null>(null);
  const [editEntryContent, setEditEntryContent] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"typed" | "handwritten">("typed");
  const [recordingsMap, setRecordingsMap] = useState<
    Record<number, RecordedStroke[]>
  >({});

  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/backend/api/session`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch session. Please try again.");
        }

        const data = await response.json();
        if (data.user_id) {
          setSession(data);
          fetchEntries(data.user_id, dateFrom, dateTo);
        } else {
          navigate("/login");
        }
      } catch (error) {
        handleError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [dateFrom, dateTo]);

  const fetchEntries = async (
    userId: number,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    try {
      const response = await fetch(
        `/backend/api/entries/${userId}?date_from=${dateFrom || ""}&date_to=${
          dateTo || ""
        }`,
        {
          credentials: "include",
        },
      );

      if (response.status === 204) {
        setEntries([]);
      } else if (response.ok) {
        const entriesData = await response.json();

        // Extract recordingsMap for each entry
        const newRecordingsMap: Record<number, RecordedStroke[]> = {};
        entriesData.forEach((entry: any) => {
          if (entry.recordings) {
            newRecordingsMap[entry.id] = JSON.parse(entry.recordings);
          }
        });

        setEntries(entriesData);
        setRecordingsMap(newRecordingsMap);
      } else {
        throw new Error("Failed to fetch your diary. Please try again.");
      }
    } catch (error) {
      handleError(error);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    debugger;

    e.preventDefault();
    try {
      const entryData =
        activeTab === "handwritten"
          ? { content: newEntry, recordings_map: JSON.stringify(recordingsMap) }
          : { content: newEntry, recordings_map: JSON.stringify([]) };

      const response = await fetch(`/backend/api/entries/${session.user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(entryData),
      });

      if (!response.ok) {
        throw new Error("Failed to save your thoughts. Please try again.");
      }

      const message = await response.json();
      toast.success(message);
      setNewEntry("");
      setRecordingsMap({});
      fetchEntries(session.user_id, dateFrom, dateTo);
    } catch (error) {
      handleError(error);
    }
  };

  const handleEditEntry = async (entryId: number, content: string) => {
    try {
      const response = await fetch(
        `/backend/api/entries/${session.user_id}/${entryId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update your thoughts. Please try again.");
      }

      toast.success("Your entry has been updated!");
      setEditEntryId(null);
      setEditEntryContent("");
      fetchEntries(session.user_id, dateFrom, dateTo);
    } catch (error) {
      handleError(error);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    try {
      const response = await fetch(
        `/backend/api/entries/${session.user_id}/${entryId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete the entry. Please try again.");
      }

      toast.success("The entry has been deleted.");
      fetchEntries(session.user_id, dateFrom, dateTo);
    } catch (error) {
      handleError(error);
    }
  };

  const handleDeleteSelectedEntries = async () => {
    if (selectedEntries.length > 0) {
      try {
        const response = await fetch(
          `/backend/api/entries/${session.user_id}/delete_multiple`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ entry_ids: selectedEntries }),
          },
        );

        if (!response.ok) {
          throw new Error(
            "Failed to delete selected entries. Please try again.",
          );
        }

        toast.success("Selected entries have been deleted.");
        setSelectedEntries([]);
        fetchEntries(session.user_id, dateFrom, dateTo);
      } catch (error) {
        handleError(error);
      }
    }
  };

  const toggleSelectEntry = (entryId: number) => {
    setSelectedEntries((prevSelected) =>
      prevSelected.includes(entryId)
        ? prevSelected.filter((id) => id !== entryId)
        : [...prevSelected, entryId],
    );
  };

  const handleSelectDateFrom = (date: any) => {
    const dateStr = date.format("YYYY-MM-DD");
    setDateFrom(dateStr);
    fetchEntries(session.user_id, dateStr, dateTo);
  };

  const handleSelectDateTo = (date: any) => {
    const dateStr = date.format("YYYY-MM-DD");
    setDateTo(dateStr);
    fetchEntries(session.user_id, dateFrom, dateStr);
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`/backend/api/logout`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to log out. Please try again.");
      }

      toast.success("Logged out successfully.");
      navigate("/login");
    } catch (error) {
      handleError(error);
    }
  };

  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      toast.error(error.message);
    } else {
      toast.error("An unexpected error occurred.");
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    session && (
      <div className="Diary">
        <Header username={session?.username} handleLogout={handleLogout} />

        <div id="entry-section">
          <br />
          <h2>Express your thoughts...</h2>

          <br></br>
          <div className="tab-switcher">
            <button
              className={activeTab === "typed" ? "active" : ""}
              onClick={() => setActiveTab("typed")}
            >
              Typed
            </button>
            <button
              className={activeTab === "handwritten" ? "active" : ""}
              onClick={() => setActiveTab("handwritten")}
            >
              Handwritten
            </button>
          </div>

          <form id="entry-form" onSubmit={handleAddEntry}>
            {activeTab === "typed" && (
              <textarea
                id="content"
                required
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
              />
            )}

            {activeTab === "handwritten" && (
              <div className="handwriting-section">
                <h3>Handwritten Thoughts</h3>
                <br></br>

                <Drawing
                  recordingsMap={recordingsMap}
                  setRecordingsMap={setRecordingsMap}
                  tooling={true}
                />
              </div>
            )}

            <br></br>
            <button type="submit">Add</button>
          </form>

          <br />

          <div id="calendar-section">
            <div>
              <label>Select Date From: </label>
              <DatePicker
                defaultValue={dayjs()}
                format="YYYY-MM-DD"
                onChange={handleSelectDateFrom}
              />
            </div>
            <div>
              <label>Select Date To: </label>
              <DatePicker
                defaultValue={dayjs()}
                format="YYYY-MM-DD"
                onChange={handleSelectDateTo}
              />
            </div>
          </div>

          {selectedEntries.length > 0 && (
            <div className="bulk-actions-toolbar">
              <span>{selectedEntries.length} selected</span>
              <button onClick={handleDeleteSelectedEntries}>
                <FontAwesomeIcon icon={faTrashAlt} /> Delete Selected
              </button>
              <button onClick={() => setSelectedEntries([])}>
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
            </div>
          )}

          <div id="entries-list">
            {entries !== null && entries.length === 0 ? (
              <div className="no-entries">
                <FontAwesomeIcon icon={faBookOpen} size="3x" />
                <h3>No diaries found 😕</h3>
                <p>Write your first thoughts for today!</p>
              </div>
            ) : (
              entries !== null &&
              entries.map((entry) => (
                <div className="entry" key={entry.id}>
                  <div className="edit-area">
                    <time title={entry.created_at}>
                      {formatDate(entry.created_at)}
                    </time>

                    {entry.recordings_map && entry.recordings_map.length > 0 ? (
                      <div className="handwriting-section">
                        <h3>Handwritten Entry</h3>
                        <Drawing
                          recordingsMap={JSON.parse(entry.recordings_map)}
                          setRecordingsMap={() => {}}
                          tooling={false}
                        />
                      </div>
                    ) : (
                      <textarea
                        readOnly={editEntryId !== entry.id}
                        value={
                          editEntryId === entry.id
                            ? editEntryContent
                            : entry.content
                        }
                        onChange={(e) => setEditEntryContent(e.target.value)}
                      />
                    )}
                  </div>

                  <div className="entry-actions">
                    {editEntryId === entry.id ? (
                      <FontAwesomeIcon
                        icon={faSave}
                        title="Save"
                        onClick={() =>
                          handleEditEntry(entry.id, editEntryContent)
                        }
                      />
                    ) : (
                      <>
                        <FontAwesomeIcon
                          icon={faEdit}
                          title="Edit"
                          onClick={() => {
                            setEditEntryId(entry.id);
                            setEditEntryContent(entry.content);
                          }}
                        />
                        <FontAwesomeIcon
                          icon={faTrash}
                          title="Delete"
                          onClick={() => handleDeleteEntry(entry.id)}
                        />
                        <FontAwesomeIcon
                          icon={faCheck}
                          className={`select-icon ${
                            selectedEntries.includes(entry.id) ? "selected" : ""
                          }`}
                          title="Select for bulk delete"
                          onClick={() => toggleSelectEntry(entry.id)}
                        />
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  );
};

export default Diary;

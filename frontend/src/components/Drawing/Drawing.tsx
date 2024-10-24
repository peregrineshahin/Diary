import React, { Component, createRef } from "react";
// @ts-ignore -- a js lib without types...
import Atrament from "atrament";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { library, icon } from "@fortawesome/fontawesome-svg-core";

library.add(faPen);
import "./styles.scss";

interface Point {
  x: number;
  y: number;
}

interface Segment {
  point: Point;
  time: number;
}

export interface RecordedStroke {
  weight: number;
  mode: string;
  smoothing: number;
  color: string;
  adaptiveStroke: boolean;
  segments: Segment[];
}

interface DrawingProps {
  recordingsMap: Record<number, RecordedStroke[]>; // Indexed by page number
  setRecordingsMap: React.Dispatch<
    React.SetStateAction<Record<number, RecordedStroke[]>>
  >;
  tooling: boolean | undefined;
}

interface DrawingState {
  atrament: Atrament | null;
  penSize: number;
  eraseMode: boolean;
  currentPage: number;
  isReplaying: boolean;
}

class Drawing extends Component<DrawingProps, DrawingState> {
  canvasRef = createRef<HTMLCanvasElement>();

  constructor(props: DrawingProps) {
    super(props);
    this.state = {
      atrament: null,
      penSize: 2,
      eraseMode: false,
      currentPage: 0,
      isReplaying: false,
    };
  }

  componentDidMount() {
    this.initializeCanvas();
  }

  componentDidUpdate(prevProps: DrawingProps, prevState: DrawingState) {
    const { currentPage, isReplaying } = this.state;

    if (prevState.currentPage !== currentPage) {
      this.replayRecording();
    }

    if (prevProps.tooling !== this.props.tooling && !this.props.tooling) {
      this.replayRecording();
    }
  }

  componentWillUnmount() {
    const { atrament } = this.state;
    if (atrament) {
      atrament.destroy();
    }
  }

  initializeCanvas = () => {
    if (this.canvasRef.current) {
      const canvas = this.canvasRef.current;
      const container = canvas.parentElement;

      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }

      const atramentInstance = new Atrament(canvas, {
        color: "#000000",
        weight: this.state.penSize,
        adaptiveStroke: false,
        smoothing: 1,
      });

      this.setState({ atrament: atramentInstance });
      atramentInstance.recordStrokes = true;

      // Replay the current page recordings if there are any
      const { recordingsMap } = this.props;
      const { currentPage } = this.state;
      if (recordingsMap[currentPage]?.length > 0) {
        this.playRecorded(atramentInstance, recordingsMap[currentPage]);
      }

      if (this.props.tooling) {
        atramentInstance.addEventListener(
          "strokerecorded",
          this.handleStrokeRecorded,
        );
      }
    }
  };

  handleStrokeRecorded = (e: any) => {
    const { isReplaying, currentPage } = this.state;
    if (isReplaying) return;

    const stroke = e.stroke as RecordedStroke;
    // Save strokes immediately to the map for the current page
    this.props.setRecordingsMap((prevMap) => ({
      ...prevMap,
      [currentPage]: [...(prevMap[currentPage] || []), stroke],
    }));
  };

  replayRecording = async () => {
    const { atrament, isReplaying, currentPage } = this.state;
    const { recordingsMap } = this.props;

    if (isReplaying || !atrament || !this.canvasRef.current) return;

    this.setState({ isReplaying: true });

    const canvas = this.canvasRef.current;
    canvas.style.pointerEvents = "none";

    try {
      atrament.recordStrokes = false;
      await this.playRecorded(atrament, recordingsMap[currentPage].slice());
    } catch (error) {
      console.error("Error during replay:", error);
    }

    canvas.style.pointerEvents = "auto";
    this.setState({ isReplaying: false });
  };

  playRecorded = async (
    atrament: Atrament,
    recordedStrokes: RecordedStroke[],
  ): Promise<void> => {
    atrament.clear();
    for (const recordedStroke of recordedStrokes) {
      atrament.weight = recordedStroke.weight;
      atrament.smoothing = recordedStroke.smoothing;
      atrament.color = recordedStroke.color;
      atrament.adaptiveStroke = recordedStroke.adaptiveStroke;

      const normalizedSegments = this.normalizeSegmentTimes(
        recordedStroke.segments,
      );

      const reference = performance.now();
      await this.waitUntil(reference, normalizedSegments[0].time);

      let prevPoint = normalizedSegments[0].point;
      atrament.beginStroke(prevPoint.x, prevPoint.y);

      for (const segment of normalizedSegments) {
        await this.waitUntil(reference, segment.time);
        prevPoint = atrament.draw(
          segment.point.x,
          segment.point.y,
          prevPoint.x,
          prevPoint.y,
        );
      }

      atrament.endStroke(prevPoint.x, prevPoint.y);
    }
  };

  normalizeSegmentTimes = (segments: Segment[]): Segment[] => {
    const startTime = segments[0].time;
    const endTime = segments[segments.length - 1].time;
    const totalDuration = endTime - startTime;

    const scaleFactor = totalDuration > 1000 ? 1000 / totalDuration : 1;

    return segments.map((segment) => ({
      ...segment,
      time: (segment.time - startTime) * scaleFactor + startTime,
    }));
  };

  waitUntil = (reference: number, time: number): Promise<void> => {
    const timeElapsed = performance.now() - reference;
    const timeToWait = Math.min(1000, Math.max(0, time - timeElapsed));

    return new Promise((resolve) => {
      setTimeout(resolve, timeToWait);
    });
  };

  // Tool functions
  handlePenSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = parseInt(e.target.value, 10);
    this.setState({ penSize: newSize });

    const { atrament } = this.state;
    if (atrament) {
      atrament.weight = newSize;
    }
  };

  toggleErase = () => {
    const { atrament, eraseMode } = this.state;
    if (atrament && !this.state.isReplaying) {
      this.setState({ eraseMode: !eraseMode });
      atrament.mode = eraseMode ? "draw" : "erase";
    }
  };

  handleClear = () => {
    const { atrament, currentPage } = this.state;
    const { tooling, setRecordingsMap } = this.props;

    if (atrament && !this.state.isReplaying && tooling) {
      atrament.clear();
      setRecordingsMap((prevMap) => ({
        ...prevMap,
        [currentPage]: [],
      }));
    }
  };

  // Page navigation
  handleNextPage = () => {
    const { currentPage } = this.state;
    const totalPages = Object.keys(this.props.recordingsMap).length; // Total number of pages
    if (currentPage < totalPages - 1) {
      this.setState({ currentPage: currentPage + 1 });
    }
  };

  handlePreviousPage = () => {
    const { currentPage } = this.state;
    if (currentPage > 0) {
      this.setState({ currentPage: currentPage - 1 });
    }
  };

  // Add new page to recordingsMap and switch to that page
  handleAddPage = () => {
    const { setRecordingsMap } = this.props;

    setRecordingsMap((prevMap) => {
      const newPage = Object.keys(prevMap).length; // New page index
      return {
        ...prevMap,
        [newPage]: [], // Create an empty array for the new page
      };
    });

    this.setState((prevState) => ({
      currentPage: prevState.currentPage + 1, // Move to the new page
    }));
  };

  render() {
    const { penSize, eraseMode, currentPage, isReplaying } = this.state;
    const { tooling } = this.props;

    const penIconSvg = icon(faPen).html[0];
    const resizedPenIconSvg = penIconSvg.replace("<svg ", '<svg height="16" ');
    const svgBase64 = btoa(resizedPenIconSvg);

    const customCursorStyle: React.CSSProperties = {
      cursor: `url('data:image/svg+xml;base64,${svgBase64}') 0 16, auto`,
    };

    return (
      <div className="Drawing">
        {tooling && (
          <div className="toolbar">
            <input
              type="range"
              min={2}
              max="50"
              value={penSize}
              onChange={this.handlePenSizeChange}
              disabled={isReplaying || !tooling}
            />
            <button
              type="button"
              onClick={this.toggleErase}
              disabled={isReplaying || !tooling}
            >
              {eraseMode ? "Draw" : "Erase"}
            </button>
            <button
              type="button"
              onClick={this.handleClear}
              disabled={isReplaying || !tooling}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={this.replayRecording}
              disabled={isReplaying}
            >
              {isReplaying ? "Replaying..." : "Replay"}
            </button>
          </div>
        )}

        <div className="drawing-container">
          <canvas ref={this.canvasRef} style={customCursorStyle} />
        </div>

        <br />
        <div className="pagination">
          <button
            type="button"
            onClick={this.handlePreviousPage}
            disabled={currentPage === 0 || isReplaying}
          >
            Previous
          </button>
          <span>Page {currentPage + 1}</span>
          <button
            type="button"
            onClick={this.handleNextPage}
            disabled={isReplaying}
          >
            Next
          </button>
          <button type="button" onClick={this.handleAddPage}>
            Add Page
          </button>
        </div>
      </div>
    );
  }
}

export default Drawing;

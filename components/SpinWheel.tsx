import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { User } from '../types';

interface SpinWheelProps {
  users: User[];
  onComplete: () => void;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({ users, onComplete }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!svgRef.current || users.length === 0) return;

    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2;

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3.pie<User>().value(1).sort(null);
    const arc = d3.arc<d3.PieArcDatum<User>>().innerRadius(0).outerRadius(radius);

    const arcs = svg.selectAll("arc")
      .data(pie(users))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", (d, i) => color(i.toString()))
      .attr("stroke", "white")
      .style("stroke-width", "2px");

    arcs.append("text")
      .attr("transform", (d) => {
        const _d = arc.centroid(d);
        const x = _d[0];
        const y = _d[1];
        // Rotate text to be readable
        const rotation = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
        return `translate(${x*1.5}, ${y*1.5}) rotate(${rotation + 90})`; // Push text out
      })
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .text(d => d.data.name.split(' ')[0])
      .style("fill", "white")
      .style("font-size", "12px")
      .style("font-weight", "bold");

      // Pointer
      svg.append("path")
      .attr("d", "M-15,-180 L15,-180 L0,-140 Z")
      .attr("fill", "#333")
      .attr("transform", "translate(0, -10)");

  }, [users]);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);

    const svg = d3.select(svgRef.current).select("g");
    const duration = 4000;
    // Rotate at least 5 times (1800 deg) plus a random amount
    const rotation = 1800 + Math.random() * 360; 

    svg.transition()
      .duration(duration)
      .ease(d3.easeCubicOut)
      .attrTween("transform", function() {
        return d3.interpolateString("translate(200,200) rotate(0)", `translate(200,200) rotate(${rotation})`);
      })
      .on("end", () => {
        setSpinning(false);
        onComplete();
      });
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-xl">
      <h3 className="text-2xl font-bold mb-4 text-slate-800">Finding your matches...</h3>
      <div className="relative overflow-hidden rounded-full border-4 border-slate-200 shadow-inner bg-slate-100">
        <svg ref={svgRef}></svg>
      </div>
      <button 
        onClick={spin}
        disabled={spinning}
        className="mt-8 px-8 py-3 bg-purple-600 text-white rounded-full font-bold text-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg"
      >
        {spinning ? "Spinning..." : "SPIN TO PAIR!"}
      </button>
      <p className="mt-4 text-slate-500 text-sm">Click to assign Cris Moms & Children randomly!</p>
    </div>
  );
};
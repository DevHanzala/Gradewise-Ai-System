const Recommendations = ({ recommendations }) => {
  if (!recommendations) return <p className="text-gray-500 text-center py-4">No recommendations available</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Weak Areas */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Focus Areas</h4>
        {recommendations.weak_areas?.length > 0 ? (
          <div className="space-y-3">
            {recommendations.weak_areas.map((area, index) => (
              <div key={index} className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-blue-800">{area.topic}</p>
                <p className="text-sm text-blue-600 mb-2">{area.performance}% performance</p>
                <p className="text-xs text-blue-700">{area.suggestion}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No specific focus areas identified</p>
        )}
      </div>

      {/* Study Plan */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Study Plan</h4>
        <div className="space-y-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <h5 className="font-medium text-green-800 mb-2">Daily Practice</h5>
            {recommendations.study_plan?.daily_practice?.map((practice, index) => (
              <p key={index} className="text-sm text-green-700">
                • {practice.topic}: {practice.focus} ({practice.time_allocation})
              </p>
            ))}
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <h5 className="font-medium text-yellow-800 mb-2">Weekly Review</h5>
            {recommendations.study_plan?.weekly_review?.map((review, index) => (
              <p key={index} className="text-sm text-yellow-700">
                • {review.topic}: {review.activity} - {review.goal}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recommendations;
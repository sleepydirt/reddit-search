# app.py
from flask import Flask, render_template, request, jsonify
import requests
from datetime import datetime
from markdown import markdown

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()

    kind = data.get('kind', 'submission')  # Default to submission
    base_url = f'https://api.pullpush.io/reddit/{kind}/search'

    params = {
        'q': data.get('q', ''),
        'subreddit': data.get('subreddit'),
        'size': data.get('size', 10),  # Default size is 10, max 100 (pullpush API limits)
        'author': data.get('author'),
    }

    # PullPush API expects unix timestamp for 'before' and 'after' parameters
    # 'before' parameter shows results before a certain date ('until' field in form)
    # 'after' parameter shows results after a certain date ('since' field in form)

    # Handle 'until' date
    if data.get('until'):
        try:
            until_dt = datetime.fromisoformat(data['until'].replace('T', ' '))
            params['before'] = int(until_dt.timestamp())
        except ValueError:
            return jsonify({'error': 'Invalid "until" date format'}), 400

    # Handle 'since' date
    if data.get('since'):
        try:
            since_dt = datetime.fromisoformat(data['since'].replace('T', ' '))
            params['after'] = int(since_dt.timestamp())
        except ValueError:
            return jsonify({'error': 'Invalid "since" date format'}), 400

    # Remove None values and empty strings from params
    params = {k: v for k, v in params.items() if v is not None and v != ''}

    try:
        response = requests.get(base_url, params=params)
        response.raise_for_status()
        submissions = response.json().get('data', []) # Get data, default to empty list if no results

        if not submissions:
          return jsonify({'message': 'No results found.'}), 200


        render_md = True  # Default to rendering Markdown

        for submission in submissions:
            if render_md:
                if 'selftext' in submission:
                    submission['selftext_html'] = markdown(
                        submission['selftext'],
                        extensions=['fenced_code', 'tables', 'nl2br']
                    )
                if 'body' in submission:
                    submission['body_html'] = markdown(
                        submission['body'],
                        extensions=['fenced_code', 'tables', 'nl2br']
                    )

        return jsonify(submissions)
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Request error: {e}'}), 500
    except Exception as e:
        return jsonify({'error': f'An unexpected error occurred: {e}'}), 500
    
if __name__ == '__main__':
    app.run(debug=True)
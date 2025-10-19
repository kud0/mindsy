'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export default function CreateCoursePage() {
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingFolders, setIsGeneratingFolders] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);

  // Form data
  const [institution, setInstitution] = useState('');
  const [typeOfStudy, setTypeOfStudy] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [syllabusUrl, setSyllabusUrl] = useState('');

  // Validation
  const canProceedStep1 = institution.trim().length > 0;
  const canProceedStep2 = typeOfStudy.trim().length > 0;
  const canProceedStep3 = courseCode.trim().length > 0;
  const canCreate = canProceedStep1 && canProceedStep2 && canProceedStep3;

  const handleCreateCourse = async () => {
    if (!canCreate) return;

    setIsCreating(true);

    try {
      // Step 1: Create course
      const response = await fetch('/api/courses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_code: courseCode.trim(),
          institution: institution.trim(),
          type_of_study: typeOfStudy.trim(),
          course_name: courseName.trim() || undefined,
          year: year.trim() || undefined,
          semester: semester.trim() || undefined,
          auto_enroll: true
        })
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to create course');
        setIsCreating(false);
        return;
      }

      console.log('✅ Course created:', data.course.id);
      setCourseId(data.course.id);

      // Step 2: Generate folders with AI
      setIsCreating(false);
      setIsGeneratingFolders(true);

      console.log('📁 Generating folders for course...');
      const foldersResponse = await fetch(`/api/courses/${data.course.id}/generate-folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syllabus_url: syllabusUrl.trim() || undefined
        })
      });

      const foldersData = await foldersResponse.json();

      if (foldersData.success) {
        console.log(`✅ Generated ${foldersData.folders_created} folders`);
      } else {
        console.warn('⚠️ Folder generation failed:', foldersData.error);
      }

      // Step 3: Show success
      setIsGeneratingFolders(false);
      setIsComplete(true);

      // Redirect to course page after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/courses/${data.course.id}`);
      }, 2000);

    } catch (error) {
      console.error('Course creation error:', error);
      alert('Failed to create course');
      setIsCreating(false);
      setIsGeneratingFolders(false);
    }
  };

  // Loading state while generating folders
  if (isGeneratingFolders) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <Loader2 className="w-16 h-16 mx-auto text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Generating Your Folders
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Our AI is searching the web for typical course structures and creating a personalized folder organization for you...
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Course Created Successfully!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your folders have been generated and you're all set to start organizing your materials.
            </p>
            <Button onClick={() => router.push(`/dashboard/courses/${courseId}`)} className="w-full">
              View My Course
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Wizard steps
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create New Course
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Step {step} of 4
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {/* Step 1: Institution */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  What institution is this course from?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  This helps us understand the context and find relevant course structures
                </p>
                <Input
                  placeholder="e.g., Stanford University, MIT, Harvard"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && canProceedStep1 && setStep(2)}
                  className="text-lg py-6"
                  autoFocus
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  size="lg"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Type of Study */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  What type of program is this?
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  This helps our AI understand how courses are typically structured
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {['University', 'Professional School', 'Online Course', 'Bootcamp', 'Certificate Program', 'Other'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeOfStudy(type)}
                      className={`p-4 text-left border-2 rounded-lg transition-all ${
                        typeOfStudy === type
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <p className="font-medium text-gray-900 dark:text-white">{type}</p>
                    </button>
                  ))}
                </div>
                {typeOfStudy === 'Other' && (
                  <Input
                    placeholder="Specify type..."
                    value={typeOfStudy === 'Other' ? '' : typeOfStudy}
                    onChange={(e) => setTypeOfStudy(e.target.value)}
                    className="mt-4"
                    autoFocus
                  />
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  size="lg"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Course Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Tell us about the course
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  The course code is required, but you can add more details if you'd like
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Course Code *
                    </label>
                    <Input
                      placeholder="e.g., CS 101, MATH 201"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                      className="text-lg py-6"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Course Name (Optional)
                    </label>
                    <Input
                      placeholder="e.g., Introduction to Computer Science"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      className="py-6"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={!canProceedStep3}
                  size="lg"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Year Level & Semester */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Almost done! Add some context
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  These are optional but help organize your courses
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Year Level (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate'].map((yearLevel) => (
                        <button
                          key={yearLevel}
                          onClick={() => setYear(yearLevel)}
                          className={`p-3 text-left border-2 rounded-lg transition-all ${
                            year === yearLevel
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <p className="font-medium text-sm text-gray-900 dark:text-white">{yearLevel}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Semester (Optional)
                    </label>
                    <Input
                      placeholder="e.g., Fall 2024, Spring Semester"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="py-6"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Syllabus URL (Optional but Recommended!)
                    </label>
                    <Input
                      placeholder="https://example.edu/courses/CS101/syllabus"
                      value={syllabusUrl}
                      onChange={(e) => setSyllabusUrl(e.target.value)}
                      className="py-6"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      💡 Paste the link to your course's official syllabus for more accurate folder organization
                    </p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    <strong>Next:</strong> Our AI will search for your course's official syllabus and create folders based on the actual course structure!
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleCreateCourse}
                  disabled={!canCreate || isCreating}
                  size="lg"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Course'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

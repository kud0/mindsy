'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Users, BookOpen, ArrowLeft, ArrowRight } from 'lucide-react';

interface Course {
  id: string;
  course_code: string;
  course_name?: string;
  institution: string;
  semester?: string;
  enrollment_count: number;
  template_count: number;
  is_enrolled: boolean;
}

interface CourseDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseSelect: (course: Course) => void;
  onCreateCourse: (courseData: {
    course_code: string;
    institution: string;
    semester?: string;
    course_name?: string;
  }) => void;
}

export function CourseDiscoveryModal({
  isOpen,
  onClose,
  onCourseSelect,
  onCreateCourse
}: CourseDiscoveryModalProps) {
  // Wizard state
  const [step, setStep] = useState<'search' | 'createStep1' | 'createStep2' | 'createStep3' | 'createStep4'>('search');

  // Form data
  const [courseCode, setCourseCode] = useState('');
  const [institution, setInstitution] = useState('');
  const [semester, setSemester] = useState('');
  const [courseName, setCourseName] = useState('');
  const [typeOfStudy, setTypeOfStudy] = useState('');
  const [year, setYear] = useState('');

  // Search results
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSearch = async () => {
    if (!courseCode.trim() || !institution.trim()) {
      return;
    }

    setIsSearching(true);
    setSearched(false);

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_code: courseCode,
          institution: institution,
          semester: semester || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.courses || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
      setSearched(true);
    }
  };

  const handleCreateCourse = async () => {
    if (!courseCode.trim() || !institution.trim()) {
      alert('Please enter course code and institution');
      return;
    }

    setIsCreating(true);
    try {
      // Call the create handler with all wizard data
      await onCreateCourse({
        course_code: courseCode.trim(),
        institution: institution.trim(),
        type_of_study: typeOfStudy.trim() || undefined,
        course_name: courseName.trim() || undefined,
        year: year.trim() || undefined,
        semester: semester.trim() || undefined
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setStep('search');
    setCourseCode('');
    setInstitution('');
    setSemester('');
    setCourseName('');
    setTypeOfStudy('');
    setYear('');
    setSearchResults([]);
    setSearched(false);
  };

  const startCreating = () => {
    setStep('createStep1');
  };

  const canProceedStep1 = institution.trim().length > 0;
  const canProceedStep2 = typeOfStudy.trim().length > 0;
  const canProceedStep3 = courseCode.trim().length > 0;
  const canCreate = canProceedStep1 && canProceedStep2 && canProceedStep3;

  const getStepTitle = () => {
    switch (step) {
      case 'search': return 'Join a Course';
      case 'createStep1': return 'Create New Course - Step 1 of 4';
      case 'createStep2': return 'Create New Course - Step 2 of 4';
      case 'createStep3': return 'Create New Course - Step 3 of 4';
      case 'createStep4': return 'Create New Course - Step 4 of 4';
      default: return 'Join a Course';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto dark:bg-background/90 dark:backdrop-blur-2xl border-gray-200/50 dark:border-white/10 shadow-xl dark:shadow-2xl dark:shadow-black/50">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
        </DialogHeader>

        {/* Search Mode */}
        {step === 'search' && (
          <div className="space-y-4">
            {/* Search Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Course Code *
                </label>
                <Input
                  placeholder="e.g., CS 101, MATH 201"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Institution *
                </label>
                <Input
                  placeholder="e.g., Stanford University"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Semester (Optional)
                </label>
                <Input
                  placeholder="e.g., Fall 2024"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <Button
                onClick={handleSearch}
                disabled={isSearching || !courseCode.trim() || !institution.trim()}
                className="w-full"
              >
                <Search className="w-4 h-4 mr-2" />
                {isSearching ? 'Searching...' : 'Search for Course'}
              </Button>
            </div>

            {/* Search Results */}
            {searched && (
              <div className="border-t pt-4">
                {searchResults.length > 0 ? (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Found {searchResults.length} {searchResults.length === 1 ? 'course' : 'courses'}
                    </h3>
                    <div className="space-y-2">
                      {searchResults.map((course) => (
                        <button
                          key={course.id}
                          onClick={() => onCourseSelect(course)}
                          className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {course.course_code}
                                {course.course_name && ` - ${course.course_name}`}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {course.institution}
                                {course.semester && ` • ${course.semester}`}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {course.enrollment_count} students
                                </span>
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-4 h-4" />
                                  {course.template_count} templates
                                </span>
                              </div>
                            </div>
                            {course.is_enrolled && (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded">
                                Enrolled
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 dark:text-gray-500 mb-4">
                      <BookOpen className="w-12 h-12 mx-auto mb-2" />
                      <p className="font-medium">No courses found</p>
                      <p className="text-sm">Be the first to create this course!</p>
                    </div>

                    <Button onClick={startCreating} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Course
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>
                Close
              </Button>
              {!searched && (
                <Button onClick={startCreating} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Create Step 1: Institution */}
        {step === 'createStep1' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Let's start by identifying your institution
              </p>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Institution Name *
              </label>
              <Input
                placeholder="e.g., Stanford University, MIT, Harvard"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && canProceedStep1 && setStep('createStep2')}
                autoFocus
              />
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('search')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep('createStep2')} disabled={!canProceedStep1}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Create Step 2: Type of Study */}
        {step === 'createStep2' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                What type of educational program is this?
              </p>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type of Study *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['University', 'Professional School', 'Online Course', 'Bootcamp', 'Certificate Program', 'Other'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeOfStudy(type)}
                    className={`p-3 text-left border rounded-lg transition-colors ${
                      typeOfStudy === type
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <p className="font-medium text-sm">{type}</p>
                  </button>
                ))}
              </div>
              {typeOfStudy === 'Other' && (
                <Input
                  placeholder="Specify type..."
                  value={typeOfStudy === 'Other' ? '' : typeOfStudy}
                  onChange={(e) => setTypeOfStudy(e.target.value)}
                  className="mt-3"
                  autoFocus
                />
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('createStep1')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep('createStep3')} disabled={!canProceedStep2}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Create Step 3: Course Details */}
        {step === 'createStep3' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Tell us about the course
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Course Code *
                  </label>
                  <Input
                    placeholder="e.g., CS 101, MATH 201"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Course Name (Optional)
                  </label>
                  <Input
                    placeholder="e.g., Introduction to Computer Science"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('createStep2')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep('createStep4')} disabled={!canProceedStep3}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Create Step 4: Year & Semester */}
        {step === 'createStep4' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Almost done! Add some context (optional)
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Year (Optional)
                  </label>
                  <Input
                    placeholder="e.g., 2024, 2024-2025"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Semester (Optional)
                  </label>
                  <Input
                    placeholder="e.g., Fall 2024, Spring Semester"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  After creating your course, we'll use AI to automatically generate a folder structure to help you organize your materials!
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep('createStep3')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleCreateCourse} disabled={!canCreate || isCreating}>
                {isCreating ? 'Creating...' : 'Create Course'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
